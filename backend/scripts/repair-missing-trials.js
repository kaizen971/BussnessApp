// Aperçu par défaut : node scripts/repair-missing-trials.js [--apply]
// Ne contacte aucun client. Le job d'expiration traitera ensuite les essais échus.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function repairMissingTrials(db, apply = false) {
  const users = db.collection('users');
  const subscriptions = db.collection('subscriptions');
  const trial = await db.collection('subscriptionplans').findOne({
    isActive: true, price: 0, durationType: 'days', duration: { $gt: 0 },
  }, { sort: { sortOrder: 1, duration: 1 } });
  const plan = trial || { name: 'EAS Essai', duration: 7, maxProjects: 1 };
  let count = 0;
  const candidates = users.aggregate([
    { $match: { role: 'admin', isActive: true, createdAt: { $type: 'date' } } },
    { $lookup: { from: 'subscriptions', localField: '_id', foreignField: 'adminId', as: 'subscriptions' } },
    { $match: { 'subscriptions.0': { $exists: false } } },
    { $project: { _id: 1, createdAt: 1 } },
  ]);
  for await (const user of candidates) {
    const endDate = new Date(user.createdAt);
    endDate.setDate(endDate.getDate() + plan.duration);
    const now = new Date();
    const record = {
      adminId: user._id, ...(trial ? { planId: trial._id } : {}),
      planName: plan.name, plan: 'custom', status: endDate <= now ? 'expired' : 'active',
      startDate: user.createdAt, endDate, amount: 0, currency: 'EUR',
      duration: plan.duration, durationType: 'days', maxProjects: plan.maxProjects || 1,
      paymentMethod: 'donation', createdAt: now, updatedAt: now,
      notes: 'Rattrapage inscription sans abonnement ; essai daté depuis la création du compte.',
    };
    // Revérifier avant écriture ; exécuter hors inscriptions/paiements concurrents.
    if (apply && !await subscriptions.findOne({ adminId: user._id })) await subscriptions.insertOne(record);
    count++;
    console.log(JSON.stringify({ adminId: String(user._id), endDate, status: record.status }));
  }
  return count;
}

if (require.main === module) {
  (async () => {
    try {
      if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI requis');
      await mongoose.connect(process.env.MONGODB_URI, { dbName: 'BussnessApp', serverSelectionTimeoutMS: 5000 });
      const apply = process.argv.includes('--apply');
      const count = await repairMissingTrials(mongoose.connection.db, apply);
      console.log(`${count} compte(s). ${apply ? 'Rattrapage effectué.' : 'Aperçu uniquement ; --apply pour enregistrer.'}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}

module.exports = { repairMissingTrials };
