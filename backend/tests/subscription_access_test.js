/**
 * Tests de la règle d'accès selon l'abonnement (subscriptionAccess.js)
 * Usage : node tests/subscription_access_test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const access = require('../subscriptionAccess');

const DAY = 24 * 60 * 60 * 1000;
const ago = (days) => new Date(Date.now() - days * DAY);
const inDays = (days) => new Date(Date.now() + days * DAY);

// Mini-mock des modèles mongoose : filtres simples (égalité, $ne, $gt, $in, $or, null)
const matches = (doc, filter) => Object.entries(filter).every(([key, cond]) => {
  if (key === '$or') return cond.some((f) => matches(doc, f));
  const value = doc[key];
  if (cond === null) return value === null || value === undefined;
  if (cond instanceof Date) return +value === +cond;
  if (typeof cond === 'object' && !Array.isArray(cond)) {
    return Object.entries(cond).every(([op, v]) => {
      if (op === '$ne') return v === null ? value !== null && value !== undefined : String(value) !== String(v);
      if (op === '$gt') return value !== null && value !== undefined && value > v;
      if (op === '$lt') return value !== null && value !== undefined && value < v;
      if (op === '$in') return v.map(String).includes(String(value));
      throw new Error(`opérateur non géré ${op}`);
    });
  }
  return String(value) === String(cond);
});

const query = (result) => {
  const q = { select: () => q, sort: () => q, then: (res, rej) => Promise.resolve(result()).then(res, rej) };
  return q;
};

const makeMongoose = ({ users = [], projects = [], subs = [], plans = [] }) => {
  const model = (docs) => ({
    findById: (id) => query(() => docs.find((d) => String(d._id) === String(id)) || null),
    findOne: (filter) => query(() => docs
      .filter((d) => matches(d, filter))
      .sort((a, b) => (b.startDate || 0) - (a.startDate || 0))[0] || null),
    find: (filter) => query(() => docs.filter((d) => matches(d, filter)).sort((a, b) => a.price - b.price)),
  });
  const models = { User: model(users), Project: model(projects), Subscription: model(subs), SubscriptionPlan: model(plans) };
  return { model: (name) => models[name] };
};

const PLANS = [
  { _id: 'p-trial', name: 'EAS Essai', price: 0, isActive: true },
  { _id: 'p-premium', name: 'EAS Premium', price: 48, isActive: true },
  { _id: 'p-basic', name: 'EAS Basic', price: 10, isActive: true },
  { _id: 'p-old', name: 'Ancien plan', price: 5, isActive: false },
];

test.beforeEach(() => access.invalidateAccessCache());

test('essai terminé sans autre abonnement → admin bloqué (trial_expired)', async () => {
  const m = makeMongoose({
    users: [{ _id: 'a1', role: 'admin' }],
    subs: [{ adminId: 'a1', status: 'expired', amount: 0, durationType: 'days', startDate: ago(10), endDate: ago(3) }],
  });
  const s = await access.computeAccessStatus(m, 'a1');
  assert.strictEqual(s.locked, true);
  assert.strictEqual(s.isOwner, true);
  assert.strictEqual(s.reason, 'trial_expired');
});

test('plan offert à 0 € sur un an, expiré → bloqué mais pas « essai »', async () => {
  const m = makeMongoose({
    users: [{ _id: 'a1', role: 'admin' }],
    subs: [{ adminId: 'a1', status: 'expired', amount: 0, durationType: 'years', startDate: ago(100), endDate: inDays(200) }],
  });
  const s = await access.computeAccessStatus(m, 'a1');
  assert.deepStrictEqual([s.locked, s.reason], [true, 'subscription_expired']);
});

test('abonnement actif non échu → pas bloqué', async () => {
  const m = makeMongoose({
    users: [{ _id: 'a1', role: 'admin' }],
    subs: [
      { adminId: 'a1', status: 'expired', amount: 0, durationType: 'days', startDate: ago(20), endDate: ago(13) },
      { adminId: 'a1', status: 'active', amount: 10, startDate: ago(12), endDate: inDays(300) },
    ],
  });
  assert.strictEqual((await access.computeAccessStatus(m, 'a1')).locked, false);
});

test('abonnement "active" mais date dépassée (job pas encore passé) → bloqué', async () => {
  const m = makeMongoose({
    users: [{ _id: 'a1', role: 'admin' }],
    subs: [{ adminId: 'a1', status: 'active', amount: 10, startDate: ago(400), endDate: ago(1) }],
  });
  const s = await access.computeAccessStatus(m, 'a1');
  assert.strictEqual(s.locked, true);
  assert.strictEqual(s.reason, 'subscription_expired');
});

test('admin sans aucun abonnement démarré (tentative Stripe abandonnée) → pas bloqué', async () => {
  const m = makeMongoose({
    users: [{ _id: 'a1', role: 'admin' }],
    subs: [{ adminId: 'a1', status: 'cancelled', amount: 10, startDate: null, endDate: null }],
  });
  assert.strictEqual((await access.computeAccessStatus(m, 'a1')).locked, false);
});

test("employé : suit l'abonnement du propriétaire du projet", async () => {
  const base = {
    users: [{ _id: 'a1', role: 'admin' }, { _id: 'e1', role: 'cashier', projectId: 'pr1' }],
    projects: [{ _id: 'pr1', ownerId: 'a1' }],
  };
  const locked = await access.computeAccessStatus(makeMongoose({
    ...base, subs: [{ adminId: 'a1', status: 'expired', amount: 0, durationType: 'days', startDate: ago(10), endDate: ago(3) }],
  }), 'e1');
  assert.deepStrictEqual([locked.locked, locked.isOwner], [true, false]);

  const ok = await access.computeAccessStatus(makeMongoose({
    ...base, subs: [{ adminId: 'a1', status: 'active', amount: 10, startDate: ago(3), endDate: inDays(30) }],
  }), 'e1');
  assert.strictEqual(ok.locked, false);
});

test('garde : 402 hors liste blanche, routes auth/abonnement toujours ouvertes', async () => {
  const m = makeMongoose({
    users: [{ _id: 'a1', role: 'admin' }],
    subs: [{ adminId: 'a1', status: 'expired', amount: 0, durationType: 'days', startDate: ago(10), endDate: ago(3) }],
  });
  const guard = access.createAccessGuard(m);
  const denial = await guard({ originalUrl: '/BussnessApp/sales?projectId=x' }, { _id: 'a1' });
  assert.strictEqual(denial.code, 'SUBSCRIPTION_REQUIRED');
  for (const url of ['/BussnessApp/auth/me', '/BussnessApp/auth/delete-account', '/BussnessApp/subscription/validate-receipt', '/BussnessApp/feedback']) {
    assert.strictEqual(await guard({ originalUrl: url }, { _id: 'a1' }), null, url);
  }
});

test("offre : plan Basic pour un essai ; même plan pour un abonnement payant s'il est encore actif", async () => {
  const m = makeMongoose({ plans: PLANS });
  assert.strictEqual((await access.findOfferPlan(m, { amount: 0, planId: 'p-trial' })).name, 'EAS Basic');
  assert.strictEqual((await access.findOfferPlan(m, { amount: 48, planId: 'p-premium' })).name, 'EAS Premium');
  assert.strictEqual((await access.findOfferPlan(m, { amount: 5, planId: 'p-old' })).name, 'EAS Basic');
});

test('lien de paiement signé : aller-retour et rejet des jetons étrangers', () => {
  const link = access.buildPayLink(jwt, 's3cret', 'https://ex.com/bussnessapp/', 'a1', 'p-basic');
  assert.match(link, /^https:\/\/ex\.com\/bussnessapp\/subscription\/pay\?token=/);
  const token = decodeURIComponent(link.split('token=')[1]);
  assert.deepStrictEqual(
    (({ adminId, planId }) => ({ adminId, planId }))(access.verifyPayToken(jwt, 's3cret', token)),
    { adminId: 'a1', planId: 'p-basic' },
  );
  assert.throws(() => access.verifyPayToken(jwt, 'autre', token));
  const loginToken = jwt.sign({ id: 'a1', role: 'admin' }, 's3cret');
  assert.throws(() => access.verifyPayToken(jwt, 's3cret', loginToken));
});

test("email d'offre : contient le lien, le prix, et échappe le nom", () => {
  const { subject, html } = access.buildOfferEmail({
    user: { fullName: '<b>Awa</b>' },
    plan: { name: 'EAS Basic', price: 10, currency: 'EUR', duration: 1, durationType: 'years', maxProjects: 1 },
    payLink: 'https://ex.com/pay?token=abc',
    reason: 'trial_expired',
    endedAt: ago(1),
  });
  assert.match(subject, /essai/);
  assert.ok(html.includes('https://ex.com/pay?token=abc'));
  assert.ok(html.includes('10 €'));
  assert.ok(html.includes('&lt;b&gt;Awa&lt;/b&gt;') && !html.includes('<b>Awa</b>'));
});
