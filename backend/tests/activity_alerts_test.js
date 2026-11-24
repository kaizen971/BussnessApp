const test = require('node:test');
const assert = require('node:assert/strict');
const { decide, validateSettingsInput, normalizeSettings, createActivityTracker } = require('../activityAlerts');

const DAY = 86400000;
const now = new Date('2026-11-07T12:00:00Z');
const ago = (days) => new Date(now.getTime() - days * DAY);

test('client inactif au-delà du seuil sans alerte en cours : création', () => {
  const d = decide({ lastActivityAt: ago(20), activeAlert: null, thresholdDays: 14, now });
  assert.equal(d.action, 'create');
  assert.equal(d.inactiveDays, 20);
});

test('client actif sous le seuil : aucune alerte', () => {
  assert.equal(decide({ lastActivityAt: ago(3), activeAlert: null, thresholdDays: 14, now }).action, 'none');
});

test('seuil atteint pile : alerte', () => {
  assert.equal(decide({ lastActivityAt: ago(14), activeAlert: null, thresholdDays: 14, now }).action, 'create');
});

test('alerte déjà en cours et toujours inactif : pas de doublon, simple mise à jour', () => {
  const activeAlert = { lastActivityAt: ago(30), inactiveDays: 29 };
  const d = decide({ lastActivityAt: ago(30), activeAlert, thresholdDays: 14, now });
  assert.equal(d.action, 'refresh');
  assert.equal(d.inactiveDays, 30);
});

test('alerte traitée (acknowledged) reste en cours : pas de nouvelle alerte', () => {
  const activeAlert = { status: 'acknowledged', lastActivityAt: ago(40) };
  assert.equal(decide({ lastActivityAt: ago(40), activeAlert, thresholdDays: 14, now }).action, 'refresh');
});

test('nouvelle activité après l’alerte : reprise d’activité', () => {
  const activeAlert = { lastActivityAt: ago(30) };
  assert.equal(decide({ lastActivityAt: ago(0), activeAlert, thresholdDays: 14, now }).action, 'reactivate');
});

test('seuil relevé sans nouvelle activité : clôture silencieuse', () => {
  const activeAlert = { lastActivityAt: ago(20) };
  const d = decide({ lastActivityAt: ago(20), activeAlert, thresholdDays: 30, now });
  assert.deepEqual([d.action, d.resolution], ['close', 'threshold_changed']);
});

test('compte désactivé : pas d’alerte, l’alerte en cours est clôturée', () => {
  assert.equal(decide({ lastActivityAt: ago(90), activeAlert: null, thresholdDays: 14, now, accountActive: false }).action, 'none');
  const d = decide({ lastActivityAt: ago(90), activeAlert: { lastActivityAt: ago(90) }, thresholdDays: 14, now, accountActive: false });
  assert.deepEqual([d.action, d.resolution], ['close', 'account_disabled']);
});

test('validation du seuil configurable', () => {
  assert.deepEqual(validateSettingsInput({ inactivityDays: 30, enabled: true }), { settings: { inactivityDays: 30, enabled: true } });
  assert.ok(validateSettingsInput({ inactivityDays: 0 }).error);
  assert.ok(validateSettingsInput({ inactivityDays: 400 }).error);
  assert.ok(validateSettingsInput({ inactivityDays: 2.5 }).error);
  assert.ok(validateSettingsInput({ enabled: 'oui' }).error);
  assert.deepEqual(normalizeSettings(undefined), { enabled: true, inactivityDays: 14, emailEnabled: true });
  assert.deepEqual(validateSettingsInput({ emailEnabled: false }), { settings: { emailEnabled: false } });
  assert.ok(validateSettingsInput({ emailEnabled: 'oui' }).error);
});

test('une panne du suivi est réessayée à la requête suivante sans attendre l’intervalle', async () => {
  let attempts = 0;
  const track = createActivityTracker({
    User: { updateOne() { if (++attempts === 1) throw new Error('Mongo indisponible'); } },
    logger: { warn() {} }, clock: () => 1000,
  });
  await track('u1');
  await track('u1');
  await track('u1');
  assert.equal(attempts, 2);
});

test('suivi d’activité : au plus une écriture par intervalle', async () => {
  const writes = [];
  const track = createActivityTracker({ User: { updateOne: async (f) => writes.push(f._id) }, intervalMs: 60000 });
  track('u1'); track('u1'); track('u2');
  await new Promise(r => setImmediate(r));
  assert.deepEqual(writes, ['u1', 'u2']);
});
