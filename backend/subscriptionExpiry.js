const access = require('./subscriptionAccess');

// La date d'expiration et l'envoi d'email sont indépendants : une panne SMTP
// ne doit ni maintenir l'accès ni empêcher une nouvelle tentative à l'heure suivante.
function createExpiryJob({ mongoose, getStripe = () => null, sendNotice, logger = console }) {
  let running = false;
  return async function expireSubscriptions() {
    if (running) return;
    running = true;
    try {
      const Subscription = mongoose.model('Subscription');
      const User = mongoose.model('User');
      const now = new Date();
      const subscriptions = await Subscription.find({
        endDate: { $lte: now },
        $or: [{ status: 'active' }, { status: 'expired', expiryNotifiedAt: null }],
      });
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
        } catch (error) {
          logger.warn(`[expireSubscriptions] ${subscription._id} : ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`[expireSubscriptions] ${error.message}`);
    } finally {
      running = false;
    }
  };
}

module.exports = { createExpiryJob };
