const test = require('node:test');
const assert = require('node:assert/strict');
const { createExpiryJob } = require('../subscriptionExpiry');
const access = require('../subscriptionAccess');

const DAY = 86400000;
function fixture({ days = 1, notified = false, current = null } = {}) {
  const sub = {
    _id: 's1', adminId: 'u1', status: 'active', endDate: new Date(Date.now() - days * DAY),
    expiryNotifiedAt: notified ? new Date() : undefined,
    async save() {},
  };
  const notices = [];
  let fail = false;
  const mongoose = { model(name) {
    if (name === 'User') return { findById: async () => ({ _id: 'u1', email: 'test@example.com' }) };
    return {
      find: async (filter) => {
        assert.ok(filter.endDate.$lte >= sub.endDate);
        assert.equal(filter.endDate.$gt, undefined, 'aucune limite de rattrapage');
        return sub.status === 'active' || !sub.expiryNotifiedAt ? [sub] : [];
      },
      findOne: async (filter) => {
        assert.ok(filter.$or, 'rechercher un abonnement réellement en cours');
        return current;
      },
    };
  } };
  const job = createExpiryJob({ mongoose, logger: { warn() {}, error() {} },
    sendNotice: async () => { if (fail) throw new Error('SMTP indisponible'); notices.push(sub._id); },
  });
  return { sub, notices, job, setFail(value) { fail = value; } };
}

test('expiration de plus de sept jours, même déjà notifiée : statut expiré', async () => {
  const f = fixture({ days: 30, notified: true });
  await f.job();
  assert.equal(f.sub.status, 'expired');
  assert.equal(f.notices.length, 0);
});

test('échec SMTP : accès expiré mais email réessayé puis marqué après succès', async () => {
  const f = fixture({ days: 30 });
  f.setFail(true);
  await f.job();
  assert.equal(f.sub.status, 'expired');
  assert.equal(f.sub.expiryNotifiedAt, undefined);
  f.setFail(false);
  await f.job();
  assert.ok(f.sub.expiryNotifiedAt instanceof Date);
  await f.job();
  assert.deepEqual(f.notices, ['s1']);
});

test('un abonnement encore en cours empêche la relance', async () => {
  const f = fixture({ current: { status: 'active', endDate: new Date(Date.now() + DAY) } });
  await f.job();
  assert.equal(f.sub.status, 'expired');
  assert.equal(f.notices.length, 0);
});

test('deux passages concurrents du job ne doublent pas l’envoi', async () => {
  const f = fixture();
  await Promise.all([f.job(), f.job()]);
  assert.equal(f.notices.length, 1);
});

test('inscription sans offre : essai configuré ou sept jours par défaut', async () => {
  const configured = { name: 'Essai', duration: 14, durationType: 'days', price: 0 };
  const mongoose = (plan) => ({ model: () => ({ findOne: () => ({ sort: async () => plan }) }) });
  assert.equal(await access.findRegistrationTrialPlan(mongoose(configured)), configured);
  const fallback = await access.findRegistrationTrialPlan(mongoose(null));
  assert.equal(fallback.duration, 7);
  assert.equal(fallback.durationType, 'days');
  assert.equal(fallback.price, 0);
});

function simulationFixture(overrides = {}) {
  const sub = {
    _id: 'test-sub', adminId: 'test-admin', status: 'active', amount: 0, durationType: 'days',
    startDate: new Date(Date.now() - DAY), endDate: new Date(Date.now() + DAY),
    paymentMethod: 'donation', updatedAt: new Date(Date.now() - DAY),
    async save() {}, ...overrides,
  };
  const notices = [];
  let fail = false;
  let raced = false;
  let current = [sub];
  let stripeCalls = 0;
  const mongoose = { model(name) {
    if (name === 'User') return { findById: async (id) => ({ _id: id, email: 'debug@example.com' }) };
    return {
      find: async (filter) => {
        // Une simulation ne doit pas lancer le rattrapage global des autres comptes.
        assert.equal(filter.adminId, 'test-admin');
        return current.filter(s => s.status === 'active' && (!s.endDate || s.endDate > filter.$or[1].endDate.$gt));
      },
      findOneAndUpdate: async (filter, update, options) => {
        assert.equal(filter._id, sub._id);
        assert.equal(filter.adminId, sub.adminId);
        assert.equal(filter.status, 'active');
        assert.equal(filter.endDate, sub.endDate);
        assert.equal(options.new, true);
        if (raced) return null;
        Object.assign(sub, update.$set);
        return sub;
      },
      findOne: async () => null,
    };
  } };
  const job = createExpiryJob({ mongoose,
    getStripe: () => ({ subscriptions: { cancel: async () => { stripeCalls++; } } }),
    logger: { warn() {}, error() {} },
    sendNotice: async (user, subscription) => {
      if (fail) throw new Error('SMTP indisponible');
      notices.push({ user, subscription });
    },
  });
  return { sub, notices, job, simulate: () => job({ simulateForAdminId: 'test-admin', subscriptionId: sub._id }),
    setFail() { fail = true; }, setRace() { raced = true; },
    addCurrent() { current = [sub, { ...sub, _id: 'second-sub' }]; },
    get stripeCalls() { return stripeCalls; },
  };
}

test('simulation ciblée : fin immédiate, expiration et même notification, sans appel Stripe', async () => {
  const f = simulationFixture();
  const before = new Date();
  const result = await f.simulate();
  assert.deepEqual(result, { expired: true, emailSent: true });
  assert.equal(f.sub.status, 'expired');
  assert.ok(f.sub.endDate >= before && f.sub.endDate <= new Date());
  assert.ok(f.sub.expiryNotifiedAt instanceof Date);
  assert.equal(f.notices.length, 1);
  assert.equal(f.notices[0].user._id, 'test-admin');
  assert.equal(f.stripeCalls, 0);
  await assert.rejects(f.simulate(), { status: 409 });
  assert.equal(f.notices.length, 1);
});

test('simulation : SMTP en panne laisse l’accès expiré et la notification en attente', async () => {
  const f = simulationFixture();
  f.setFail();
  assert.deepEqual(await f.simulate(), { expired: true, emailSent: false });
  assert.equal(f.sub.status, 'expired');
  assert.equal(f.sub.expiryNotifiedAt, null);
});

test('simulation : refuse les abonnements facturés par un prestataire sans les modifier', async () => {
  for (const external of [
    { stripeSubscriptionId: 'sub_external' }, { stripeSessionId: 'cs_external' },
    { stripePaymentLinkUrl: 'https://example.com/pay' },
    { paymentMethod: 'apple_iap' }, { paymentMethod: 'google_play' },
  ]) {
    const f = simulationFixture(external);
    const endDate = f.sub.endDate;
    await assert.rejects(f.simulate(), { status: 409 });
    assert.equal(f.sub.status, 'active');
    assert.equal(f.sub.endDate, endDate);
    assert.equal(f.notices.length, 0);
    assert.equal(f.stripeCalls, 0);
  }
});

test('simulation : refuse plusieurs abonnements en cours ou un abonnement non démarré', async () => {
  const f = simulationFixture();
  f.addCurrent();
  await assert.rejects(f.simulate(), { status: 409 });
  for (const startDate of [null, new Date(Date.now() + DAY)]) {
    await assert.rejects(simulationFixture({ startDate }).simulate(), { status: 409 });
  }
});

test('simulation : changement concurrent et double clic ne déclenchent pas deux emails', async () => {
  const raced = simulationFixture();
  raced.setRace();
  await assert.rejects(raced.simulate(), { status: 409 });
  assert.equal(raced.sub.status, 'active');
  const f = simulationFixture();
  const results = await Promise.allSettled([f.simulate(), f.simulate()]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.notices.length, 1);
});
