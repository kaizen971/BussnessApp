const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { attachCustomerSalesTotals } = require('../customerSalesTotals');

test('recalcule les achats depuis les ventes affectées au client, remboursements compris', async () => {
  const projectId = new mongoose.Types.ObjectId();
  const otherProjectId = new mongoose.Types.ObjectId();
  const firstId = new mongoose.Types.ObjectId();
  const secondId = new mongoose.Types.ObjectId();
  const customers = [
    { _id: firstId, totalPurchases: 999 },
    { _id: secondId, totalPurchases: 50 },
  ];
  const sales = [
    { projectId, customerId: firstId, amount: 120 },
    { projectId, customerId: firstId, amount: -120 },
    { projectId, customerId: firstId, amount: 30 },
    { projectId: otherProjectId, customerId: firstId, amount: 500 },
  ];
  const Sale = {
    async aggregate(pipeline) {
      const [{ $match }, { $group }] = pipeline;
      assert.equal(String($match.projectId), String(projectId));
      assert.deepEqual($group, { _id: '$customerId', amount: { $sum: '$amount' } });
      const amounts = new Map();
      for (const sale of sales) {
        if (String(sale.projectId) !== String($match.projectId)) continue;
        if (!$match.customerId.$in.some((id) => String(id) === String(sale.customerId))) continue;
        const key = String(sale.customerId);
        amounts.set(key, (amounts.get(key) || 0) + sale.amount);
      }
      return [...amounts].map(([id, amount]) => ({ _id: id, amount }));
    },
  };

  assert.equal(await attachCustomerSalesTotals(customers, projectId, Sale), customers);
  assert.equal(customers[0].totalPurchases, 30);
  assert.equal(customers[1].totalPurchases, 0);

  // Une réaffectation change immédiatement le total des deux fiches.
  sales[3].projectId = projectId;
  sales[3].customerId = secondId;
  sales[2].customerId = secondId;
  await attachCustomerSalesTotals(customers, projectId, Sale);
  assert.equal(customers[0].totalPurchases, 0);
  assert.equal(customers[1].totalPurchases, 530);
});

test('ne lance aucune agrégation quand il n’y a pas de clients', async () => {
  const Sale = { aggregate() { throw new Error('unexpected query'); } };
  assert.deepEqual(await attachCustomerSalesTotals([], new mongoose.Types.ObjectId(), Sale), []);
});
