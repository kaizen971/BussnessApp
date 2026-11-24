const test = require('node:test');
const assert = require('node:assert/strict');
const { createActivityAlertJob, computeLastActivity } = require('../activityAlerts');
const { createActivityEmailNotifier, buildInactivityEmail } = require('../activityAlertEmail');
const { createLoginRecorder } = require('../userActivity');
const { createActivityTracker } = require('../activityAlerts');
const fs = require('node:fs');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');

const DAY = 86400000;
const now = new Date('2026-11-24T12:00:00Z');
const ago = days => new Date(+now - days * DAY);
const logger = { warn() {}, error() {} };

// Modèles isolés, sans connexion à une base ni envoi SMTP réel.
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(doc, part));
    const actual = doc[key];
    if (value === null) return actual == null;
    if (value instanceof Date) return +actual === +value;
    if (typeof value === 'object') return Object.entries(value).every(([op, expected]) => {
      if (op === '$ne') return actual !== expected;
      if (op === '$in') return (Array.isArray(actual) ? actual : [actual]).some(v => expected.includes(v));
      if (op === '$lte') return actual != null && actual <= expected;
      throw new Error(`Opérateur non géré : ${op}`);
    });
    return actual === value;
  });
}

function update(doc, changes) {
  Object.assign(doc, changes.$set);
  for (const key of Object.keys(changes.$unset || {})) delete doc[key];
  for (const [key, value] of Object.entries(changes.$max || {})) if (doc[key] == null || value > doc[key]) doc[key] = value;
  for (const [key, value] of Object.entries(changes.$inc || {})) doc[key] = (doc[key] || 0) + value;
  for (const [key, value] of Object.entries(changes.$addToSet || {})) doc[key] = [...new Set([...(doc[key] || []), value])];
}

function model(docs) {
  function query(filter, single = false) {
    let sort;
    let limit;
    const run = () => {
      const result = docs.filter(doc => matches(doc, filter));
      if (sort) {
        const [key, direction] = Object.entries(sort)[0];
        result.sort((a, b) => ((a[key] || 0) - (b[key] || 0)) * direction);
      }
      return structuredClone(single ? result[0] || null : result.slice(0, limit));
    };
    const q = { select: () => q, sort: value => { sort = value; return q; }, limit: value => { limit = value; return q; }, lean: () => q,
      then: (resolve, reject) => Promise.resolve().then(run).then(resolve, reject) };
    return q;
  }
  return {
    find: filter => query(filter), findOne: filter => query(filter, true), findById: id => query({ _id: id }, true),
    async create(doc) {
      if (doc.ongoing && docs.some(d => d.adminId === doc.adminId && d.ongoing)) throw Object.assign(new Error('Doublon'), { code: 11000 });
      const saved = { _id: `record-${docs.length + 1}`, ...structuredClone(doc) };
      docs.push(saved);
      return structuredClone(saved);
    },
    async updateOne(filter, changes) {
      const doc = docs.find(d => matches(d, filter));
      if (!doc) return { modifiedCount: 0 };
      update(doc, changes);
      return { modifiedCount: 1 };
    },
    async findOneAndUpdate(filter, changes) {
      const doc = docs.find(d => matches(d, filter));
      if (!doc) return null;
      update(doc, changes);
      return structuredClone(doc);
    },
  };
}

function fixture(settings = {}) {
  const users = [{ _id: 'a1', role: 'admin', isActive: true, fullName: 'Awa', email: 'awa@example.com', createdAt: ago(30), lastLogin: ago(20) }];
  const alerts = [];
  const superAdmins = [{ isActive: true, email: 'equipe1@example.com' }, { isActive: true, email: 'equipe2@example.com' },
    { isActive: false, email: 'desactive@example.com' }];
  const settingDocs = [{ key: 'activityAlerts', value: { enabled: true, inactivityDays: 14, emailEnabled: true, ...settings } }];
  const projects = [];
  const sales = [];
  const logs = [];
  const models = { User: model(users), Project: model(projects), Sale: model(sales), ActivityLog: model(logs),
    ClientActivityAlert: model(alerts), SuperAdmin: model(superAdmins), BackofficeSetting: model(settingDocs) };
  const mongoose = { models, model: name => models[name] };
  let time = now;
  let failing = '';
  const sends = [];
  const sendEmail = async (to, subject, html) => { sends.push({ to, subject, html }); return to !== failing; };
  const options = { mongoose, sendEmail, logger, clock: () => new Date(time) };
  return { users, alerts, superAdmins, settingDocs, projects, sales, logs, models, mongoose, sends, options,
    job: createActivityAlertJob(options),
    notifier: () => createActivityEmailNotifier({ ...models, sendEmail, logger, clock: options.clock }),
    setTime(value) { time = value; }, setFailure(address) { failing = address; } };
}

test('cycle complet : alerte, acquittement sans répétition, reprise puis nouvelle inactivité', async () => {
  const f = fixture();
  assert.equal((await f.job()).created, 1);
  assert.equal(f.sends.length, 2);
  assert.ok(f.alerts[0].emailNotifiedAt);
  f.alerts[0].status = 'acknowledged';
  await f.job();
  assert.equal(f.sends.length, 2);
  assert.equal(f.alerts.length, 1);
  const user = structuredClone(f.users[0]);
  await createLoginRecorder({ ...f.models, clock: () => now })(user, { userAgent: 'EAS mobile' });
  assert.equal((await f.job()).reactivated, 1);
  assert.equal(f.alerts[0].resolution, 'reactivated');
  assert.equal(f.sends.length, 2, 'le retour du client ne déclenche pas de mail d’abonnement');
  assert.equal(f.logs[0].action, 'login');
  assert.equal(f.users[0].loginCount, 1);
  assert.equal(+user.lastLogin, +now);
  f.setTime(new Date(+now + 15 * DAY));
  assert.equal((await f.job()).created, 1);
  assert.equal(f.sends.length, 4);
});

test('SMTP partiellement en panne : seuls les destinataires en échec sont réessayés', async () => {
  const f = fixture();
  f.setFailure('equipe2@example.com');
  assert.equal((await f.job()).emailsFailed, 1);
  assert.equal(f.alerts[0].emailNotifiedAt, undefined);
  assert.deepEqual(f.alerts[0].emailSentTo, ['equipe1@example.com']);
  f.setFailure('');
  await f.job();
  await f.job();
  assert.deepEqual(f.sends.map(s => s.to), ['equipe1@example.com', 'equipe2@example.com', 'equipe2@example.com']);
  assert.ok(f.alerts[0].emailNotifiedAt);
});

test('deux processus concurrents ne doublent pas la notification', async () => {
  const f = fixture({ emailEnabled: false });
  await f.job();
  await Promise.all([f.notifier()(), f.notifier()()]);
  assert.equal(f.sends.length, 2);
  assert.equal(f.alerts[0].emailClaimToken, undefined);
});

test('désactiver les e-mails conserve les alertes du backoffice', async () => {
  const f = fixture({ emailEnabled: false });
  await f.job();
  assert.equal(f.alerts.length, 1);
  assert.equal(f.sends.length, 0);
});

test('désactiver les alertes supprime les envois même en vérification manuelle', async () => {
  const f = fixture({ enabled: false });
  assert.equal((await f.job()).disabled, true);
  assert.equal(f.alerts.length, 0);
  await f.job({ force: true });
  assert.equal(f.sends.length, 0);
});

test('absence de destinataires : alerte conservée puis envoyée quand l’équipe est disponible', async () => {
  const f = fixture();
  f.superAdmins.forEach(a => { a.isActive = false; });
  await f.job();
  assert.equal(f.sends.length, 0);
  assert.equal(f.alerts[0].emailNotifiedAt, undefined);
  f.superAdmins[0].isActive = true;
  await f.job();
  assert.deepEqual(f.sends.map(s => s.to), ['equipe1@example.com']);
});

test('un compte désactivé avant la reprise SMTP ne reçoit aucune nouvelle alerte', async () => {
  const f = fixture({ emailEnabled: false });
  await f.job();
  f.settingDocs[0].value.emailEnabled = true;
  f.users[0].isActive = false;
  await f.job();
  assert.equal(f.alerts[0].resolution, 'account_disabled');
  assert.equal(f.sends.length, 0);
});

test('un verrou d’envoi abandonné est repris après dix minutes', async () => {
  const f = fixture({ emailEnabled: false });
  await f.job();
  f.alerts[0].emailClaimedAt = now;
  f.alerts[0].emailClaimToken = 'processus-arrête';
  await f.notifier()();
  assert.equal(f.sends.length, 0);
  f.setTime(new Date(+now + 11 * 60000));
  await f.notifier()();
  assert.equal(f.sends.length, 2);
});

test('activité : une vente saisie rétroactivement est détectée à sa date de création', async () => {
  const f = fixture();
  f.projects.push({ _id: 'p1', ownerId: 'a1' });
  f.sales.push({ projectId: 'p1', date: ago(-5), createdAt: ago(20) },
    { projectId: 'p1', date: ago(40), createdAt: ago(1) });
  const activity = await computeLastActivity(f.mongoose, f.users);
  assert.equal(+activity.get('a1'), +ago(1));
  await f.job();
  assert.equal(f.alerts.length, 0);
});

test('activité : équipe multi-business prise en compte, membre archivé exclu', async () => {
  const f = fixture();
  f.users.push({ _id: 'a2', role: 'admin', createdAt: ago(30) });
  f.projects.push({ _id: 'p1', ownerId: 'a1' }, { _id: 'p2', ownerId: 'a2' });
  f.users.push({ _id: 'e1', role: 'manager', projectIds: ['p1', 'p2'], lastActivityAt: ago(2) },
    { _id: 'e2', role: 'cashier', projectId: 'p1', lastActivityAt: now, deletedAt: now });
  const activity = await computeLastActivity(f.mongoose, f.users.filter(u => u.role === 'admin'));
  assert.equal(+activity.get('a1'), +ago(2));
  assert.equal(+activity.get('a2'), +ago(2));
});

test('historique : panne du journal sans bloquer la connexion et compteur durable', async () => {
  const f = fixture();
  const user = structuredClone(f.users[0]);
  const record = createLoginRecorder({ User: f.models.User, logger,
    ActivityLog: { create: async () => { throw new Error('Journal indisponible'); } }, clock: () => now });
  await record(user);
  await record(user);
  assert.equal(f.users[0].loginCount, 2);
  assert.equal(+f.users[0].lastActivityAt, +now);
});

test('notification interne : échappement HTML et contenu indépendant du paiement', () => {
  const { html } = buildInactivityEmail({ user: { fullName: '<img src=x>', email: 'a&b@example.com' },
    alert: { inactiveDays: 14, thresholdDays: 14, lastActivityAt: ago(14) } });
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('a&amp;b@example.com'));
  assert.doesNotMatch(html, /Mobile Money|Stripe|wa\.me/);
});

test('routes réelles : seuls les identifiants valides créent une connexion, le refresh suit uniquement l’activité', async () => {
  const f = fixture();
  const routes = {};
  const User = { ...f.models.User, findOne: async () => {
    const user = structuredClone(f.users[0]);
    return { ...user, password: 'correct', toObject() { return { ...this }; } };
  }, findById: async () => {
    const user = structuredClone(f.users[0]);
    return { ...user, toObject() { return { ...this }; } };
  } };
  const source = fs.readFileSync(require.resolve('../server'), 'utf8');
  const trackUserActivity = createActivityTracker({ User, logger, clock: () => +now + 60000 });
  vm.runInNewContext(source.slice(source.indexOf('// Login\n'), source.indexOf('// Get current user\n')), {
    app: { post: (path, handler) => { routes[path] = handler; } }, User, jwt, JWT_SECRET: 'test-secret',
    bcrypt: { compare: async (password, hash) => password === hash },
    recordLogin: createLoginRecorder({ User, ActivityLog: f.models.ActivityLog, logger, clock: () => now }),
    trackUserActivity, TOKEN_REFRESH_GRACE_SECONDS: 30 * 86400, console: logger,
  });
  const call = async (path, body = {}, token) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
    await routes[`/BussnessApp/auth/${path}`]({ body, headers: { authorization: token && `Bearer ${token}` }, get: () => 'EAS mobile' }, res);
    return res;
  };
  assert.equal((await call('login', { username: 'awa', password: 'incorrect' })).statusCode, 401);
  assert.equal(f.logs.length, 0);
  const login = await call('login', { username: 'awa', password: 'correct' });
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.user.loginCount, 1);
  assert.equal(f.logs.length, 1);
  assert.equal(f.logs[0].userAgent, 'EAS mobile');
  assert.equal((await call('refresh', {}, login.body.token)).statusCode, 200);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.users[0].loginCount, 1);
  assert.equal(f.logs.length, 1);
  assert.equal(+f.users[0].lastActivityAt, +now + 60000);
});

test('route réelle de fiche client : suivi limité au propriétaire et aux équipes de ses business', async () => {
  const f = fixture();
  f.projects.push({ _id: 'p1', ownerId: 'a1' });
  f.users.push({ _id: 'e1', fullName: 'Équipe Awa', role: 'cashier', projectId: 'p1', lastLogin: ago(1) },
    { _id: 'e2', fullName: 'Autre business', role: 'cashier', projectId: 'foreign', lastLogin: now });
  f.logs.push({ _id: 'log1', userId: 'e1', action: 'login', createdAt: now },
    { _id: 'log2', userId: 'e2', action: 'login', createdAt: now },
    { _id: 'log3', userId: 'super1', action: 'send_upgrade_offer', entityType: 'User', entityId: 'a1', createdAt: now });
  const source = fs.readFileSync(require.resolve('../backoffice'), 'utf8');
  let handler;
  const User = { ...f.models.User, findById: id => ({ select: async () => {
    const user = f.users.find(u => u._id === id);
    return user && { ...user, toObject: () => ({ ...user }) };
  } }) };
  vm.runInNewContext(source.slice(source.indexOf("router.get('/admins/:id',"), source.indexOf("router.post('/admins',")), {
    router: { get: (path, auth, callback) => { handler = callback; } }, authenticateSuperAdmin() {},
    User, Subscription: model([]), Payment: model([]), Project: f.models.Project,
    ActivityLog: f.models.ActivityLog, activityAlerts: { computeLastActivity }, mongoose: f.mongoose,
  });
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  await handler({ params: { id: 'a1' } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Array.from(response.body.connectionUsers, u => u._id), ['a1', 'e1']);
  assert.deepEqual(new Set(response.body.activities.map(a => a._id)), new Set(['log1', 'log3']));
  assert.equal(+response.body.businessLastActivityAt, +ago(1));
  await handler({ params: { id: 'e1' } }, response);
  assert.equal(response.statusCode, 404);
});
