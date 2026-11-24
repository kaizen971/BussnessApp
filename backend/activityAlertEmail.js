const { randomUUID } = require('crypto');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const formatDate = (value) => value
  ? new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : 'Aucune connexion enregistrée';

function buildInactivityEmail({ user, alert }) {
  const name = user.fullName || user.username;
  return {
    subject: `EAS – Inactivité de ${name} (${alert.inactiveDays} jours)`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
      <h1 style="font-size: 22px;">Alerte d’inactivité EAS</h1>
      <p>Le compte de <strong>${escapeHtml(name)}</strong> (${escapeHtml(user.email)})
        n’a enregistré aucune activité depuis <strong>${alert.inactiveDays} jours</strong>.</p>
      <p>Dernière connexion du propriétaire : ${escapeHtml(formatDate(user.lastLogin))}<br>
        Dernière activité du compte ou de son équipe : ${escapeHtml(formatDate(alert.lastActivityAt))}<br>
        Seuil configuré : ${alert.thresholdDays} jours.</p>
      <p>Consultez la fiche du client dans le backoffice EAS pour voir les connexions et traiter l’alerte.</p>
      <p style="color: #777; font-size: 13px;">Une notification par destinataire et par période d’inactivité.
        Les dates sont affichées à l’heure de Paris.</p>
    </div>`,
  };
}

// Une panne SMTP laisse l'envoi en attente. Les destinataires déjà notifiés sont
// mémorisés séparément pour éviter de les relancer si un autre envoi échoue.
function createActivityEmailNotifier({ ClientActivityAlert, User, SuperAdmin, sendEmail,
  logger = console, clock = () => new Date() }) {
  return async function notify() {
    const summary = { emailsSent: 0, emailsFailed: 0 };
    const recipients = await SuperAdmin.find({ isActive: true }).select('email').lean();
    const addresses = [...new Set(recipients.map(r => r.email?.trim().toLowerCase()).filter(Boolean))];
    if (!addresses.length) return summary;
    const pending = await ClientActivityAlert.find({ type: 'inactivity', ongoing: true, emailNotifiedAt: null });
    for (const candidate of pending) {
      const now = clock();
      const claimToken = randomUUID();
      const alert = await ClientActivityAlert.findOneAndUpdate({
        _id: candidate._id, type: 'inactivity', ongoing: true, emailNotifiedAt: null,
        $or: [{ emailClaimedAt: null }, { emailClaimedAt: { $lte: new Date(now.getTime() - 10 * 60 * 1000) } }],
      }, { $set: { emailClaimedAt: now, emailClaimToken: claimToken } }, { new: true });
      if (!alert) continue;
      const claim = { _id: alert._id, emailClaimToken: claimToken };
      try {
        const user = await User.findById(alert.adminId).select('fullName username email lastLogin isActive deletedAt');
        if (!user || user.isActive === false || user.deletedAt) continue;
        const { subject, html } = buildInactivityEmail({ user, alert });
        const sent = new Set(alert.emailSentTo || []);
        for (const address of addresses) {
          if (sent.has(address)) continue;
          try {
            if (!await sendEmail(address, subject, html)) throw new Error('Envoi SMTP refusé');
            await ClientActivityAlert.updateOne(claim, { $addToSet: { emailSentTo: address } });
            sent.add(address);
            summary.emailsSent++;
          } catch (error) {
            summary.emailsFailed++;
            logger.warn(`[activityAlertEmail] ${alert._id} : ${error.message}`);
          }
        }
        if (addresses.every(address => sent.has(address))) {
          await ClientActivityAlert.updateOne(claim, { $set: { emailNotifiedAt: clock() } });
        }
      } catch (error) {
        summary.emailsFailed++;
        logger.warn(`[activityAlertEmail] ${alert._id} : ${error.message}`);
      } finally {
        await ClientActivityAlert.updateOne(claim, { $unset: { emailClaimedAt: 1, emailClaimToken: 1 } });
      }
    }
    return summary;
  };
}

module.exports = { buildInactivityEmail, createActivityEmailNotifier };
