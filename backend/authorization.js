// accessGuard (optionnel) : async (req, user) => null | corps d'une réponse 402 (abonnement requis)
const createAuthenticateToken = ({ jwt, User, secret, accessGuard }) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required', code: 'NO_TOKEN' });
  }

  jwt.verify(token, secret, async (error, claims) => {
    if (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }

    try {
      const user = await User.findById(claims.id).select('role projectId isActive');
      if (!user) {
        return res.status(401).json({ error: 'Compte introuvable', code: 'ACCOUNT_DELETED' });
      }
      if (user.isActive === false) {
        return res.status(403).json({ error: 'Compte désactivé', code: 'ACCOUNT_DISABLED' });
      }

      req.user = { ...claims, role: user.role, projectId: user.projectId };

      if (accessGuard) {
        const denial = await accessGuard(req, user);
        if (denial) return res.status(402).json(denial);
      }
      return next();
    } catch (lookupError) {
      console.error('Authentication lookup error:', lookupError);
      return res.status(500).json({ error: 'Erreur lors de l’authentification' });
    }
  });
};

const checkRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  return next();
};

module.exports = { createAuthenticateToken, checkRole };
