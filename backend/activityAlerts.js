// Alertes d'inactivité / de reprise d'activité des clients (comptes admin = business).
//
// Principe anti-répétition : un client a au plus UNE alerte d'inactivité « en cours »
// (champ `ongoing: true`, garanti par un index unique partiel). Tant qu'elle existe,
// le job se contente de la mettre à jour (jours d'inactivité) au lieu d'en recréer.
// Elle n'est clôturée que lorsque le client redevient actif (→ alerte « activité reprise »)
// ou que l'alerte n'a plus lieu d'être (compte désactivé, seuil relevé).
// Une nouvelle alerte d'inactivité ne peut donc apparaître qu'après une vraie reprise d'activité.

const DAY_MS = 24 * 60 * 60 * 1000;
const SETTINGS_KEY = 'activityAlerts';
const DEFAULT_SETTINGS = Object.freeze({ enabled: true, inactivityDays: 14, emailEnabled: true });
const MIN_DAYS = 1;
const MAX_DAYS = 365;
const { createActivityEmailNotifier } = require('./activityAlertEmail');

function registerModels(mongoose) {
  if (!mongoose.models.ClientActivityAlert) {
    const schema = new mongoose.Schema({
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      type: { type: String, enum: ['inactivity', 'reactivation'], required: true },
      status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
      // true uniquement pour l'alerte d'inactivité en cours d'un client (anti-doublon)
      ongoing: { type: Boolean, default: undefined },
      lastActivityAt: { type: Date },
      inactiveDays: { type: Number },
      thresholdDays: { type: Number },
      resolution: { type: String, enum: ['reactivated', 'account_disabled', 'threshold_changed', 'account_deleted'] },
      resolvedAt: { type: Date },
      acknowledgedAt: { type: Date },
      acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' },
      emailNotifiedAt: Date,
      emailSentTo: [String],
      emailClaimedAt: Date,
      emailClaimToken: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });
    schema.index({ adminId: 1 }, { unique: true, partialFilterExpression: { ongoing: true } });
    schema.index({ status: 1, createdAt: -1 });
    schema.index({ type: 1, ongoing: 1, emailNotifiedAt: 1 });
    mongoose.model('ClientActivityAlert', schema);
  }
  if (!mongoose.models.BackofficeSetting) {
    const schema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' },
      updatedAt: { type: Date, default: Date.now },
    });
    mongoose.model('BackofficeSetting', schema);
  }
  return {
    ClientActivityAlert: mongoose.model('ClientActivityAlert'),
    BackofficeSetting: mongoose.model('BackofficeSetting'),
  };
}

function normalizeSettings(value = {}) {
  const days = Math.round(Number(value.inactivityDays));
  return {
    enabled: value.enabled === undefined ? DEFAULT_SETTINGS.enabled : value.enabled === true,
    inactivityDays: Number.isFinite(days) ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, days)) : DEFAULT_SETTINGS.inactivityDays,
    emailEnabled: value.emailEnabled === undefined ? DEFAULT_SETTINGS.emailEnabled : value.emailEnabled === true,
  };
}

// Valide une saisie du backoffice ; renvoie { settings } ou { error }.
function validateSettingsInput(input = {}) {
  const out = {};
  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') return { error: 'enabled doit être un booléen' };
    out.enabled = input.enabled;
  }
  if (input.emailEnabled !== undefined) {
    if (typeof input.emailEnabled !== 'boolean') return { error: 'emailEnabled doit être un booléen' };
    out.emailEnabled = input.emailEnabled;
  }
  if (input.inactivityDays !== undefined) {
    const days = Number(input.inactivityDays);
    if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
      return { error: `Le seuil doit être un nombre entier de jours entre ${MIN_DAYS} et ${MAX_DAYS}` };
    }
    out.inactivityDays = days;
  }
  return { settings: out };
}

async function getSettings(mongoose) {
  const { BackofficeSetting } = registerModels(mongoose);
  const doc = await BackofficeSetting.findOne({ key: SETTINGS_KEY }).lean();
  return normalizeSettings(doc?.value);
}

async function saveSettings(mongoose, partial, updatedBy) {
  const { BackofficeSetting } = registerModels(mongoose);
  const settings = normalizeSettings({ ...(await getSettings(mongoose)), ...partial });
  await BackofficeSetting.updateOne(
    { key: SETTINGS_KEY },
    { $set: { value: settings, updatedBy, updatedAt: new Date() } },
    { upsert: true }
  );
  return settings;
}

const latest = (...dates) => dates
  .map(d => (d ? new Date(d) : null))
  .filter(d => d && !Number.isNaN(d.getTime()))
  .reduce((max, d) => (!max || d > max ? d : max), null);

// Décision pure (testable) pour un client.
// activeAlert : l'alerte d'inactivité en cours (ou null).
function decide({ lastActivityAt, activeAlert, thresholdDays, now, accountActive = true }) {
  const inactiveDays = lastActivityAt ? Math.floor((now - new Date(lastActivityAt)) / DAY_MS) : null;
  const isInactive = inactiveDays !== null && inactiveDays >= thresholdDays;

  if (!accountActive) {
    return activeAlert ? { action: 'close', resolution: 'account_disabled', inactiveDays } : { action: 'none', inactiveDays };
  }
  if (!activeAlert) {
    return isInactive ? { action: 'create', inactiveDays } : { action: 'none', inactiveDays };
  }
  const resumed = lastActivityAt && activeAlert.lastActivityAt
    && new Date(lastActivityAt) > new Date(activeAlert.lastActivityAt);
  if (resumed) return { action: 'reactivate', inactiveDays };
  if (!isInactive) return { action: 'close', resolution: 'threshold_changed', inactiveDays };
  return { action: 'refresh', inactiveDays };
}

// Dernière activité connue par client : connexions et requêtes authentifiées du
// propriétaire et de son équipe, plus dernières ventes / mouvements de stock.
async function computeLastActivity(mongoose, admins) {
  const User = mongoose.model('User');
  const Project = mongoose.model('Project');
  const Sale = mongoose.models.Sale;
  const StockMovement = mongoose.models.StockMovement;

  const result = new Map();
  for (const admin of admins) {
    result.set(String(admin._id), latest(admin.createdAt, admin.lastLogin, admin.lastActivityAt));
  }
  const bump = (adminId, date) => {
    const key = String(adminId);
    result.set(key, latest(result.get(key), date));
  };

  const projects = await Project.find({ ownerId: { $in: admins.map(a => a._id) } }).select('_id ownerId').lean();
  if (!projects.length) return result;
  const ownerByProject = new Map(projects.map(p => [String(p._id), p.ownerId]));
  const projectIds = projects.map(p => p._id);

  const team = await User.find({
    role: { $ne: 'admin' }, deletedAt: null,
    $or: [{ projectId: { $in: projectIds } }, { projectIds: { $in: projectIds } }],
  }).select('projectId projectIds lastLogin lastActivityAt').lean();
  for (const member of team) {
    const seen = latest(member.lastLogin, member.lastActivityAt);
    if (!seen) continue;
    const ids = [member.projectId, ...(member.projectIds || [])].filter(Boolean).map(String);
    for (const pid of new Set(ids)) if (ownerByProject.has(pid)) bump(ownerByProject.get(pid), seen);
  }

  // Requêtes indexées (projectId + createdAt), une par projet.
  await Promise.all(projects.map(async (project) => {
    const [sale, movement] = await Promise.all([
      Sale ? Sale.findOne({ projectId: project._id }).sort({ createdAt: -1 }).select('createdAt').lean() : null,
      StockMovement ? StockMovement.findOne({ projectId: project._id }).sort({ createdAt: -1 }).select('createdAt').lean() : null,
    ]);
    bump(project.ownerId, latest(sale?.createdAt, movement?.createdAt));
  }));
  return result;
}

function createActivityAlertJob({ mongoose, sendEmail, logger = console, clock = () => new Date() }) {
  let running = false;
  return async function checkClientActivity({ force = false } = {}) {
    if (running) return { skipped: true };
    running = true;
    const summary = { checked: 0, created: 0, reactivated: 0, closed: 0, refreshed: 0 };
    try {
      const { ClientActivityAlert } = registerModels(mongoose);
      const User = mongoose.model('User');
      const settings = await getSettings(mongoose);
      if (!settings.enabled && !force) return { ...summary, disabled: true };

      const now = clock();
      const admins = await User.find({ role: 'admin' })
        .select('_id isActive deletedAt createdAt lastLogin lastActivityAt').lean();
      const ongoing = await ClientActivityAlert.find({ ongoing: true });
      const alertByAdmin = new Map(ongoing.map(a => [String(a.adminId), a]));
      const lastActivity = await computeLastActivity(mongoose, admins);

      // Alertes en cours dont le client n'existe plus
      const adminIds = new Set(admins.map(a => String(a._id)));
      for (const alert of ongoing) {
        if (adminIds.has(String(alert.adminId))) continue;
        await ClientActivityAlert.updateOne({ _id: alert._id }, {
          $set: { status: 'resolved', resolution: 'account_deleted', resolvedAt: now, updatedAt: now },
          $unset: { ongoing: 1 },
        });
        summary.closed++;
      }

      for (const admin of admins) {
        summary.checked++;
        const key = String(admin._id);
        const activeAlert = alertByAdmin.get(key) || null;
        const lastActivityAt = lastActivity.get(key);
        try {
          const decision = decide({
            lastActivityAt, activeAlert, thresholdDays: settings.inactivityDays, now,
            accountActive: admin.isActive !== false && !admin.deletedAt,
          });
          switch (decision.action) {
            case 'create':
              await ClientActivityAlert.create({
                adminId: admin._id, type: 'inactivity', status: 'open', ongoing: true,
                lastActivityAt, inactiveDays: decision.inactiveDays,
                thresholdDays: settings.inactivityDays, createdAt: now, updatedAt: now,
              });
              summary.created++;
              break;
            case 'refresh':
              if (activeAlert.inactiveDays !== decision.inactiveDays) {
                await ClientActivityAlert.updateOne({ _id: activeAlert._id },
                  { $set: { inactiveDays: decision.inactiveDays, updatedAt: now } });
                summary.refreshed++;
              }
              break;
            case 'reactivate': {
              const closed = await ClientActivityAlert.updateOne({ _id: activeAlert._id, ongoing: true }, {
                $set: { status: 'resolved', resolution: 'reactivated', resolvedAt: now, updatedAt: now },
                $unset: { ongoing: 1 },
              });
              // Déjà traitée par une exécution concurrente : pas de seconde alerte de reprise
              if (!closed.modifiedCount) break;
              await ClientActivityAlert.create({
                adminId: admin._id, type: 'reactivation', status: 'open',
                lastActivityAt,
                // durée d'inactivité constatée avant la reprise
                inactiveDays: Math.max(0, Math.floor((new Date(lastActivityAt) - new Date(activeAlert.lastActivityAt)) / DAY_MS)),
                thresholdDays: activeAlert.thresholdDays, createdAt: now, updatedAt: now,
              });
              summary.reactivated++;
              break;
            }
            case 'close':
              await ClientActivityAlert.updateOne({ _id: activeAlert._id }, {
                $set: { status: 'resolved', resolution: decision.resolution, resolvedAt: now, updatedAt: now },
                $unset: { ongoing: 1 },
              });
              summary.closed++;
              break;
            default:
              break;
          }
        } catch (error) {
          // E11000 : alerte déjà créée par une exécution concurrente → rien à faire
          if (error?.code !== 11000) logger.warn(`[activityAlerts] ${key} : ${error.message}`);
        }
      }
      if (sendEmail && settings.enabled && settings.emailEnabled) {
        const notify = createActivityEmailNotifier({
          ClientActivityAlert, User, SuperAdmin: mongoose.model('SuperAdmin'), sendEmail, logger, clock,
        });
        Object.assign(summary, await notify());
      }
      return summary;
    } catch (error) {
      logger.error(`[activityAlerts] ${error.message}`);
      return { ...summary, error: error.message };
    } finally {
      running = false;
    }
  };
}

// Instance partagée : le planificateur et le bouton « Vérifier maintenant » du
// backoffice utilisent le même verrou d'exécution.
let sharedJob = null;
function getSharedJob(mongoose, { sendEmail } = {}) {
  if (!sharedJob) sharedJob = createActivityAlertJob({ mongoose, sendEmail });
  return sharedJob;
}

// Enregistre la dernière activité d'un utilisateur authentifié (au plus une écriture
// par utilisateur et par intervalle) — sans jamais bloquer la requête.
function createActivityTracker({ User, intervalMs = 15 * 60 * 1000, logger = console, clock = () => Date.now() }) {
  const lastWrite = new Map();
  return function trackActivity(userId) {
    if (!userId) return;
    const key = String(userId);
    const nowMs = clock();
    if (lastWrite.has(key) && nowMs - lastWrite.get(key) < intervalMs) return;
    lastWrite.set(key, nowMs);
    if (lastWrite.size > 50000) lastWrite.clear();
    return Promise.resolve()
      .then(() => User.updateOne({ _id: userId }, { $max: { lastActivityAt: new Date(nowMs) } }))
      .catch(error => {
        if (lastWrite.get(key) === nowMs) lastWrite.delete(key);
        logger.warn(`[activityTracker] ${error.message}`);
      });
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  registerModels,
  normalizeSettings,
  validateSettingsInput,
  getSettings,
  saveSettings,
  decide,
  computeLastActivity,
  createActivityAlertJob,
  getSharedJob,
  createActivityTracker,
};
