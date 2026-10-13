const createArchiveTeamMemberHandler = ({ User, Project, Schedule, canAccessProject }) => async (req, res) => {
  try {
    const projectId = String(req.body?.projectId || '');
    if (!projectId || !(await canAccessProject(req, projectId))) {
      return res.status(403).json({ error: 'Accès au projet refusé' });
    }
    const target = await User.findById(req.params.id);
    if (!target || target.deletedAt) {
      return res.status(404).json({ error: 'Collaborateur introuvable' });
    }
    if (String(target._id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte depuis l’équipe' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ error: 'Un compte administrateur ne peut pas être supprimé depuis l’équipe' });
    }

    if (!projectId || String(target.projectId) !== projectId) {
      return res.status(404).json({ error: 'Collaborateur introuvable dans ce projet' });
    }
    if (req.user.role === 'manager' && target.role !== 'cashier') {
      return res.status(403).json({ error: 'Un manager ne peut supprimer qu’un compte salarié' });
    }
    if (req.user.role === 'responsable' && target.role === 'responsable') {
      return res.status(403).json({ error: 'Un responsable ne peut pas supprimer un autre responsable' });
    }
    if (String(req.body?.confirmation || '').trim() !== String(target.fullName || target.username).trim()) {
      return res.status(400).json({ error: 'Le nom de confirmation ne correspond pas au collaborateur' });
    }
    if (await Project.exists({ ownerId: target._id })) {
      return res.status(409).json({ error: 'Ce compte possède un projet. Transférez le projet avant de supprimer ce compte.' });
    }
    if ((target.projectIds || []).some(id => String(id) !== projectId)) {
      return res.status(409).json({ error: 'Ce compte appartient aussi à un autre projet et ne peut pas être supprimé ici.' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (await Schedule.exists({ projectId, userId: target._id, status: 'scheduled', date: { $gte: today } })) {
      return res.status(409).json({ error: 'Ce collaborateur a des créneaux à venir. Réattribuez-les ou annulez-les avant de supprimer son compte.' });
    }

    // Keep the User document so sales, schedules, commissions and payroll retain
    // their references. Release login identifiers for accounts created by mistake.
    const deletedAt = new Date();
    if (!target.fullName) target.fullName = target.username;
    target.username = `deleted_${target._id}`;
    target.email = `deleted_${target._id}@deleted.invalid`;
    target.isActive = false;
    target.deletedAt = deletedAt;
    await target.save();

    return res.json({ message: 'Compte retiré de l’équipe', deletedAt });
  } catch (error) {
    console.error('Archive team member error:', error);
    return res.status(500).json({ error: 'Impossible de supprimer ce compte' });
  }
};

module.exports = { createArchiveTeamMemberHandler };
