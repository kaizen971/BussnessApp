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
