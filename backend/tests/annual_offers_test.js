const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { updateAnnualOffers } = require('../scripts/update-annual-offers');

(async () => {
  const records = [
    { _id: 'basic', name: 'EAS Basic', price: 10 },
    { _id: 'standard', name: 'EAS Standard', price: 22, maxProjects: 3, features: ['10 salariés max'], isRecurring: true },
    { _id: 'premium', name: 'EAS Premium', price: 48 },
  ];
  const db = { collection: () => ({
    find: () => ({ toArray: async () => records }),
    bulkWrite: async operations => {
      for (const { updateOne: op } of operations) {
        let record = records.find(p => op.filter._id ? p._id === op.filter._id : p.name === op.filter.name);
        if (!record) { record = { _id: 'web', ...op.update.$setOnInsert }; records.push(record); }
        Object.assign(record, op.update.$set);
      }
    },
  }) };
  await updateAnnualOffers(db);
  assert.equal(records.length, 3, 'Preview must not write');
  await updateAnnualOffers(db, true);
  await updateAnnualOffers(db, true);
  assert.equal(records.length, 4, 'Rerun must not duplicate offers');
  const web = records.find(p => p.name === 'EAS Standard + Web');
  assert.equal(web.price, 38);
  assert.equal(web.webappAccess, true);
  assert.equal(web.maxProjects, 3);
  assert.deepEqual(web.features, ['10 salariés max']);
  for (const record of records) {
    assert.equal(record.duration, 1);
    assert.equal(record.durationType, 'years');
    assert.equal(record.currency, 'EUR');
  }
  for (const root of ['frontend', 'webapp']) {
    const source = fs.readFileSync(path.join(__dirname, '../../', root, 'src/utils/subscriptionPricing.js'), 'utf8');
    const { getMonthlyFcfa, getPricePeriod } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    for (const [price, expected] of [[10,'550'], [22,'1 200'], [38,'2 100'], [48,'2 600']]) {
      const plan = {price, duration: 1, durationType: 'years', currency: 'EUR'};
      assert.equal(getMonthlyFcfa(plan), expected);
      assert.equal(getPricePeriod(plan), 'an');
      assert.equal(getMonthlyFcfa({...plan, currency: 'USD'}), null);
      assert.equal(getMonthlyFcfa({...plan, durationType: 'months'}), null);
      assert.equal(getPricePeriod({...plan, duration: 12, durationType: 'months'}), 'an');
    }
    assert.equal(getPricePeriod({durationType: 'lifetime'}), 'À vie');
  }
  console.log('Annual offers and pricing checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
