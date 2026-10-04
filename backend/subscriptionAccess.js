// Accès au service selon l'abonnement du propriétaire du business, et offre de passage
// à un plan payant (lien de paiement) envoyée à la fin d'un essai ou d'un abonnement.
//
// Règle de blocage : un business est bloqué quand son propriétaire (l'admin) a déjà eu un
// abonnement démarré (essai compris) et n'en a plus aucun actif. Un admin qui n'a jamais eu
// d'abonnement n'est pas bloqué ici (inscription iOS : abonnement via IAP après inscription).
// Le compte n'est jamais désactivé (isActive) : l'utilisateur doit pouvoir se connecter pour
// voir l'écran de renouvellement et pouvoir supprimer son compte (exigences App Review).

// Routes toujours accessibles, même bloqué
const ACCESS_WHITELIST = [
  /^\/BussnessApp\/auth\//i,
  /^\/BussnessApp\/subscription\//i,
  /^\/BussnessApp\/legal\//i,
  /^\/BussnessApp\/feedback/i,
];

const CACHE_TTL_UNLOCKED_MS = 5 * 60 * 1000;
const CACHE_TTL_LOCKED_MS = 20 * 1000; // court : un paiement doit débloquer rapidement
const PAY_LINK_VALIDITY = '30d';

// Cache partagé par server.js et backoffice.js (même instance de module)
const accessCache = new Map();

// Sans argument : vide tout le cache (ex. après un paiement traité par le webhook)
const invalidateAccessCache = (userId) => (userId ? accessCache.delete(String(userId)) : accessCache.clear());

const isAccessWhitelisted = (url = '') => {
  const path = url.split('?')[0];
  return ACCESS_WHITELIST.some((re) => re.test(path));
};

// Essai = abonnement gratuit de courte durée (plan « EAS Essai » : 7 jours). Un plan offert
// (don, 0 € sur un an) n'est pas un essai.
const isTrialSubscription = (sub) => !!sub && sub.amount === 0 && sub.durationType === 'days';

const isSubscriptionCurrent = (sub, now = new Date()) =>
  sub && sub.status === 'active' && (!sub.endDate || new Date(sub.endDate) > now);

async function computeAccessStatus(mongoose, userId) {
  const User = mongoose.model('User');
  const Project = mongoose.model('Project');
  const Subscription = mongoose.model('Subscription');

  const user = await User.findById(userId).select('role projectId');
  if (!user) return { locked: false };

  let ownerId = user._id;
  const isOwner = user.role === 'admin';
  if (!isOwner) {
    if (!user.projectId) return { locked: false, isOwner };
    const project = await Project.findById(user.projectId).select('ownerId');
    if (!project || !project.ownerId) return { locked: false, isOwner };
    ownerId = project.ownerId;
  }

  const now = new Date();
  const active = await Subscription.findOne({
    adminId: ownerId,
    status: 'active',
    $or: [{ endDate: null }, { endDate: { $gt: now } }],
  }).select('_id');
  if (active) return { locked: false, isOwner };

  // Dernier abonnement réellement démarré (les tentatives de paiement abandonnées n'ont pas de startDate)
  const last = await Subscription.findOne({ adminId: ownerId, startDate: { $ne: null } })
    .sort({ startDate: -1 })
    .select('amount status endDate planName planId paymentMethod durationType');
  if (!last) return { locked: false, isOwner };

  return {
    locked: true,
    isOwner,
    reason: isTrialSubscription(last) ? 'trial_expired' : last.status === 'suspended' ? 'subscription_suspended' : 'subscription_expired',
    endedAt: last.endDate || null,
    lastPlanName: last.planName || null,
  };
}

async function getAccessStatus(mongoose, userId) {
  const key = String(userId);
  const cached = accessCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await computeAccessStatus(mongoose, userId);
  accessCache.set(key, { value, expiresAt: Date.now() + (value.locked ? CACHE_TTL_LOCKED_MS : CACHE_TTL_UNLOCKED_MS) });
  return value;
}

// Garde branchée dans authenticateToken : renvoie une réponse 402 si le business est bloqué
const createAccessGuard = (mongoose) => async (req, user) => {
  if (isAccessWhitelisted(req.originalUrl || req.url)) return null;
  const status = await getAccessStatus(mongoose, user._id);
  if (!status.locked) return null;
  return {
    error: status.isOwner
      ? (status.reason === 'trial_expired'
        ? 'Votre période d\'essai est terminée. Choisissez un abonnement pour continuer.'
        : 'Votre abonnement a expiré. Renouvelez-le pour continuer.')
      : 'L\'abonnement de votre business a expiré. Contactez votre responsable.',
    code: 'SUBSCRIPTION_REQUIRED',
    reason: status.reason,
  };
};

// ---------- Offre de passage à un plan payant ----------

// Plan proposé : TRIAL_UPGRADE_PLAN_ID si défini, sinon le plan payant actif nommé « Basic »,
// sinon le moins cher des plans payants actifs. Pour un abonnement payant expiré, on propose
// d'abord le même plan s'il est toujours disponible.
async function findOfferPlan(mongoose, previousSub) {
  const SubscriptionPlan = mongoose.model('SubscriptionPlan');
  if (previousSub && previousSub.amount > 0 && previousSub.planId) {
    const same = await SubscriptionPlan.findOne({ _id: previousSub.planId, isActive: true, price: { $gt: 0 } });
    if (same) return same;
  }
  if (process.env.TRIAL_UPGRADE_PLAN_ID) {
    const configured = await SubscriptionPlan.findOne({ _id: process.env.TRIAL_UPGRADE_PLAN_ID, isActive: true, price: { $gt: 0 } });
    if (configured) return configured;
  }
  const paid = await SubscriptionPlan.find({ isActive: true, price: { $gt: 0 } }).sort({ price: 1, sortOrder: 1 });
  return paid.find((p) => /basic/i.test(p.name)) || paid[0] || null;
}

const signPayToken = (jwt, secret, adminId, planId) =>
  jwt.sign({ purpose: 'subscription_pay', adminId: String(adminId), planId: String(planId) }, secret, { expiresIn: PAY_LINK_VALIDITY });

const verifyPayToken = (jwt, secret, token) => {
  const claims = jwt.verify(token, secret);
  if (claims.purpose !== 'subscription_pay' || !claims.adminId || !claims.planId) throw new Error('Lien invalide');
  return claims;
};

const buildPayLink = (jwt, secret, publicApiUrl, adminId, planId) =>
  `${publicApiUrl.replace(/\/$/, '')}/subscription/pay?token=${encodeURIComponent(signPayToken(jwt, secret, adminId, planId))}`;

const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)' };
const planPeriodLabel = (plan) => {
  if (plan.durationType === 'lifetime') return 'à vie';
  if (plan.duration === 1) return { days: 'jour', months: 'mois', years: 'an' }[plan.durationType] || plan.durationType;
  return `${plan.duration} ${DURATION_LABELS[plan.durationType] || plan.durationType}`;
};

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Email « fin d'essai / abonnement expiré » avec l'offre et le bouton de paiement
function buildOfferEmail({ user, plan, payLink, reason, endedAt }) {
  const name = escapeHtml(user.fullName || user.username);
  const endLabel = endedAt
    ? new Date(endedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;
  const isTrial = reason === 'trial_expired';
  const subject = isTrial
    ? `Votre essai EAS est terminé : passez à ${plan.name}`
    : `Votre abonnement EAS a expiré : renouvelez ${plan.name}`;
  const features = (plan.features || []).slice(0, 6)
    .map((f) => `<li style="margin: 6px 0; color: #4A5568;">✓ ${escapeHtml(f)}</li>`).join('');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #1A1A1A, #2D2D2D); border-radius: 12px; padding: 30px; margin-bottom: 20px; text-align: center;">
        <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">EAS – Entreprendre avec Succès</h1>
      </div>
      <div style="background: #FFFFFF; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color: #1A1A1A; margin-top: 0;">${isTrial ? 'Votre période d\'essai est terminée' : 'Votre abonnement a expiré'}</h2>
        <p style="color: #4A5568;">Bonjour <strong>${name}</strong>,</p>
        <p style="color: #4A5568;">
          ${isTrial
            ? `Votre essai gratuit${endLabel ? ` a pris fin le <strong>${endLabel}</strong>` : ' est terminé'}. Merci d'avoir testé EAS !`
            : `Votre abonnement${endLabel ? ` a expiré le <strong>${endLabel}</strong>` : ' a expiré'}.`}
          Votre accès à l'application est suspendu, mais <strong>toutes vos données sont conservées</strong>.
        </p>
        <p style="color: #4A5568;">Pour continuer, nous vous proposons la licence :</p>
        <div style="border: 2px solid #D4AF37; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #1A1A1A;">${escapeHtml(plan.name)}</p>
          <p style="margin: 8px 0 0; font-size: 28px; font-weight: 800; color: #B8941E;">${plan.price} ${escapeHtml(plan.currency || 'EUR') === 'EUR' ? '€' : escapeHtml(plan.currency)}<span style="font-size: 15px; color: #718096; font-weight: 500;"> / ${planPeriodLabel(plan)}</span></p>
          ${plan.maxProjects ? `<p style="margin: 6px 0 0; color: #718096; font-size: 13px;">Jusqu'à ${plan.maxProjects} business</p>` : ''}
          ${features ? `<ul style="list-style: none; padding: 0; margin: 16px 0 0; text-align: left; display: inline-block;">${features}</ul>` : ''}
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${payLink}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #B8941E); color: #1A1A1A; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700;">
            Activer ${escapeHtml(plan.name)} – Payer en ligne
          </a>
          <p style="color: #A0AEC0; font-size: 12px; margin-top: 10px;">Paiement sécurisé par carte via Stripe. Lien valable 30 jours.</p>
        </div>
        <p style="color: #4A5568; font-size: 14px;">
          Dès le paiement confirmé, votre accès est rétabli automatiquement : il suffit de rouvrir l'application.
          Vous pouvez aussi choisir une autre offre depuis l'application (menu Abonnement).
        </p>
        <p style="color: #718096; font-size: 13px; margin-top: 30px;">
          Une question ? Répondez simplement à cet email.
        </p>
      </div>
    </div>`;

  return { subject, html };
}

module.exports = {
  ACCESS_WHITELIST,
  invalidateAccessCache,
  isAccessWhitelisted,
  isSubscriptionCurrent,
  isTrialSubscription,
  computeAccessStatus,
  getAccessStatus,
  createAccessGuard,
  findOfferPlan,
  signPayToken,
  verifyPayToken,
  buildPayLink,
  buildOfferEmail,
};
