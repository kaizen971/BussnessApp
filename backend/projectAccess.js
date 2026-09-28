// Cloisonnement des données par business (projet) : un utilisateur n'accède qu'aux projets
// dont il est propriétaire et au projet auquel il est rattaché (salarié).
// Toute route qui lit ou modifie des données d'un projet doit passer par ces helpers.

const PROJECT_DENIED = { error: 'Accès non autorisé à ce projet' };

// Rôle « salarié » (vendeur) : il ne voit pas les données sensibles (prix de revient, stock…)
const EMPLOYEE_ROLES = ['cashier'];
// Rôles d'encadrement : accès complet (produits, stock, marges), manager compris
const OWNER_ROLES = ['admin', 'responsable', 'manager'];
const isEmployeeRole = (role) => EMPLOYEE_ROLES.includes(role);

const createProjectAccess = ({ mongoose, Project, User }) => {
  // Chaîne ou ObjectId uniquement : écarte les tableaux et objets injectés via query/body ({ $ne: … })
  const isIdLike = (id) => typeof id === 'string' || id instanceof mongoose.Types.ObjectId;
  const isValidId = (id) => isIdLike(id) && mongoose.isValidObjectId(id);

  // Mémorisé sur la requête : une seule requête Mongo par appel API
  const getAccessibleProjectIds = async (req) => {
    if (!req.accessibleProjectIds) {
      const ids = new Set();
      if (req.user.projectId) ids.add(String(req.user.projectId));
      if (req.user.role !== 'cashier') {
        const owned = await Project.find({ ownerId: req.user.id }).select('_id').lean();
        owned.forEach((project) => ids.add(String(project._id)));
      }
      req.accessibleProjectIds = [...ids];
    }
    return req.accessibleProjectIds;
  };

  const canAccessProject = async (req, projectId) => {
    if (!isIdLike(projectId)) return false;
    return (await getAccessibleProjectIds(req)).includes(String(projectId));
  };

  // Valeur du filtre `projectId` d'une liste : le projet demandé s'il est accessible,
  // sinon tous les projets accessibles. null si le projet demandé n'est pas accessible.
  const projectScope = async (req, requestedProjectId) => {
    const ids = await getAccessibleProjectIds(req);
    if (requestedProjectId) {
      return isIdLike(requestedProjectId) && ids.includes(String(requestedProjectId)) ? String(requestedProjectId) : null;
    }
    return { $in: ids };
  };

  // Middleware : le projet désigné par la requête (params, query ou body) doit être accessible
  const requireProject = (getProjectId) => async (req, res, next) => {
    try {
      if (!(await canAccessProject(req, getProjectId(req)))) return res.status(403).json(PROJECT_DENIED);
      return next();
    } catch (error) {
      return next(error);
    }
  };

  // Document d'un projet accessible, ou null (la route répond 404 : on ne révèle pas son existence)
  const findInProject = async (req, Model, id, populate) => {
    if (!isValidId(id)) return null;
    let query = Model.findById(id);
    if (populate) query = query.populate(populate);
    const doc = await query;
    if (!doc || !(await canAccessProject(req, doc.projectId?._id || doc.projectId))) return null;
    return doc;
  };

  // Utilisateur rattaché à l'un des projets accessibles, ou null
  const findUserInProjects = async (req, userId) => {
    if (!isValidId(userId)) return null;
    const ids = await getAccessibleProjectIds(req);
    return User.findOne({ _id: userId, $or: [{ projectId: { $in: ids } }, { projectIds: { $in: ids } }] });
  };

  return { canAccessProject, projectScope, requireProject, findInProject, findUserInProjects };
};

module.exports = { createProjectAccess, PROJECT_DENIED, EMPLOYEE_ROLES, OWNER_ROLES, isEmployeeRole };
