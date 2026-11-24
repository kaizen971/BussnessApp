// Les connexions explicites sont historisées ; le renouvellement d'un token
// reste une activité de session et ne gonfle pas le nombre de connexions.
function createLoginRecorder({ User, ActivityLog, logger = console, clock = () => new Date() }) {
  return async function recordLogin(user, { userAgent } = {}) {
    const now = clock();
    await User.updateOne({ _id: user._id }, {
      $max: { lastLogin: now, lastActivityAt: now },
      $inc: { loginCount: 1 },
    });
    try {
      await ActivityLog.create({
        userId: user._id,
        userType: user.role === 'admin' ? 'admin' : 'user',
        action: 'login',
        details: `Connexion à EAS : ${user.fullName || user.username}`,
        entityType: 'User',
        entityId: user._id,
        userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : undefined,
        createdAt: now,
      });
    } catch (error) {
      logger.warn(`[loginHistory] ${error.message}`);
    }
    // La réponse de connexion reflète immédiatement les dates persistées.
    user.lastLogin = now;
    user.lastActivityAt = now;
    user.loginCount = (user.loginCount || 0) + 1;
  };
}

module.exports = { createLoginRecorder };
