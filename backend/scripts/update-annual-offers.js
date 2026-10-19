// Run from backend: node scripts/update-annual-offers.js [--apply]
// Uses MONGODB_URI from the environment or backend/.env. Defaults to preview.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function updateAnnualOffers(db, apply = false) {
  const plans = db.collection('subscriptionplans');
  const names = ['EAS Basic', 'EAS Standard', 'EAS Standard + Web', 'EAS Premium'];
  const prices = [10, 22, 38, 48];
  const existing = await plans.find({ name: { $in: names } }).toArray();
  for (const name of names) {
    if (existing.filter(p => p.name === name).length > 1) throw new Error(`Offre en double : ${name}`);
    if (name !== names[2] && !existing.some(p => p.name === name)) throw new Error(`Offre manquante : ${name}`);
  }
  const standard = existing.find(p => p.name === names[1]);
  const operations = names.map((name, index) => {
    const fields = {
      price: prices[index], currency: 'EUR', duration: 1, durationType: 'years',
      sortOrder: index + 1, updatedAt: new Date(),
    };
    if (name === names[2]) Object.assign(fields, { webappAccess: true, isActive: true });
    const update = { $set: fields };
    if (name === names[2]) update.$setOnInsert = {
      name, description: 'Toutes les fonctionnalités Standard avec accès Web App',
      maxProjects: standard.maxProjects, features: standard.features || [],
      isRecurring: standard.isRecurring !== false, createdAt: new Date(),
    };
    const current = existing.find(p => p.name === name);
    return { updateOne: { filter: current ? { _id: current._id } : { name }, update, upsert: !current } };
  });
  if (apply) await plans.bulkWrite(operations, { ordered: true });
  return operations;
}

if (require.main === module) {
  (async () => {
    try {
      if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI requis');
      await mongoose.connect(process.env.MONGODB_URI, { dbName: 'BussnessApp', serverSelectionTimeoutMS: 5000 });
      const apply = process.argv.includes('--apply');
      const operations = await updateAnnualOffers(mongoose.connection.db, apply);
      console.log(JSON.stringify(operations, null, 2));
      console.log(apply ? 'Offres mises à jour.' : 'Aperçu uniquement. Ajouter --apply pour enregistrer.');
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}
module.exports = { updateAnnualOffers };
