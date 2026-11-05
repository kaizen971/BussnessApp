const createDeleteAccountHandler = ({ User, Project, Feedback, Subscription, bcrypt, deleteS3Image }) => async (req, res) => {
  try {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // A project must retain a valid owner. Its deletion or transfer needs a separate workflow.
    if (await Project.exists({ ownerId: user._id })) {
      return res.status(409).json({
        error: 'Ce compte possède un projet. Contactez l’administrateur pour transférer le projet avant de supprimer votre compte.',
        code: 'PROJECT_OWNERSHIP_BLOCKS_DELETION'
      });
    }

    // Feedback is personal to the user. Sales, schedules, commissions and all other
    // shared company records remain attached to their project and are never deleted here.
    await Feedback.deleteMany({ userId: user._id });
    await Subscription.updateMany(
      { adminId: user._id },
      { status: 'cancelled', updatedAt: new Date() }
    );
    await User.findByIdAndDelete(user._id);
    await deleteS3Image(user.photo);

    return res.json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
  }
};

module.exports = { createDeleteAccountHandler };
