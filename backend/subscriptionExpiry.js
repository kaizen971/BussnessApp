const access = require('./subscriptionAccess');

// La date d'expiration et l'envoi d'email sont indépendants : une panne SMTP
// ne doit ni maintenir l'accès ni empêcher une nouvelle tentative à l'heure suivante.
function createExpiryJob({ mongoose, getStripe = () => null, sendNotice, logger = console }) {
  let running = false;
  const reject = (message, status = 409) => Object.assign(new Error(message), { status });
  return async function expireSubscriptions({ simulateForAdminId, subscriptionId } = {}) {
    if (running) {
      if (simulateForAdminId) throw reject('Une expiration est déjà en cours. Réessayez dans un instant.');
      return;
    }
    running = true;
    try {
      const Subscription = mongoose.model('Subscription');
      const User = mongoose.model('User');
      const now = new Date();
      let simulated;
      if (simulateForAdminId) {
        const current = await Subscription.find({
          adminId: simulateForAdminId, status: 'active',
          $or: [{ endDate: null }, { endDate: { $gt: now } }],
        });
        if (current.length !== 1 || String(current[0]._id) !== String(subscriptionId)) {
          throw reject('La simulation nécessite un seul abonnement en cours. Rechargez la fiche.');
        }
        const target = current[0];
        if (target.stripeSubscriptionId || target.stripeSessionId || target.stripePaymentLinkUrl
          || ['apple_iap', 'google_play'].includes(target.paymentMethod)) {
          throw reject('Utilisez un abonnement de test sans facturation Stripe, Apple ou Google.');
        }
        if (!target.startDate || new Date(target.startDate) > now) {
          throw reject('Cet abonnement n’a pas encore démarré.');
        }
        // La condition évite qu’un second clic ne relance le même email.
        simulated = await Subscription.findOneAndUpdate({
          _id: target._id, adminId: simulateForAdminId, status: 'active',
          endDate: target.endDate ?? null, updatedAt: target.updatedAt ?? null,
          stripeSubscriptionId: target.stripeSubscriptionId ?? null,
          stripeSessionId: target.stripeSessionId ?? null,
          stripePaymentLinkUrl: target.stripePaymentLinkUrl ?? null,
          paymentMethod: target.paymentMethod,
        }, { $set: { endDate: now, updatedAt: now, expiryNotifiedAt: null } }, { new: true });
        if (!simulated) throw reject('L’abonnement a changé. Rechargez la fiche.');
        access.invalidateAccessCache();
      }
      const subscriptions = simulated ? [simulated] : await Subscription.find({
        endDate: { $lte: now },
        $or: [{ status: 'active' }, { status: 'expired', expiryNotifiedAt: null }],
      });
      const result = { expired: false, emailSent: false };
      for (const subscription of subscriptions) {
        try {
          const stripe = getStripe();
          if (subscription.status === 'active' && stripe && subscription.stripeSubscriptionId) {
            try {
              await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            } catch (error) {
              logger.warn(`[expireSubscriptions] Stripe : ${error.message}`);
            }
          }
          subscription.status = 'expired';
          subscription.updatedAt = now;
          await subscription.save();
          result.expired = true;
          // Invalider aussi les accès des employés qui suivent ce propriétaire.
          access.invalidateAccessCache();
          if (subscription.expiryNotifiedAt) continue;

          const current = await Subscription.findOne({
            adminId: subscription.adminId, status: 'active',
            $or: [{ endDate: null }, { endDate: { $gt: now } }],
          });
          if (current) continue;
          const user = await User.findById(subscription.adminId);
          if (!user || !user.email) continue;
          await sendNotice(user, subscription);
          subscription.expiryNotifiedAt = new Date();
          await subscription.save();
          result.emailSent = true;
        } catch (error) {
          logger.warn(`[expireSubscriptions] ${subscription._id} : ${error.message}`);
        }
      }
      if (simulated && !result.expired) throw reject('La date de fin a été modifiée, mais le traitement a échoué. Le job réessaiera automatiquement.', 500);
      return result;
    } catch (error) {
      if (simulateForAdminId) throw error;
      logger.error(`[expireSubscriptions] ${error.message}`);
    } finally {
      running = false;
    }
  };
}

module.exports = { createExpiryJob };
