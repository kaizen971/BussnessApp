const mongoose = require('mongoose');

// Le total affiché doit suivre les ventes réellement associées au client, y compris
// les remboursements (montants négatifs) et les ventes réaffectées après création.
async function attachCustomerSalesTotals(customers, projectId, Sale) {
  if (customers.length === 0) return customers;

  const totals = await Sale.aggregate([
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(String(projectId)),
        customerId: { $in: customers.map((customer) => customer._id) },
      },
    },
    { $group: { _id: '$customerId', amount: { $sum: '$amount' } } },
  ]);
  const byCustomer = new Map(totals.map((row) => [String(row._id), row.amount]));

  for (const customer of customers) {
    customer.totalPurchases = byCustomer.get(String(customer._id)) ?? 0;
  }
  return customers;
}

module.exports = { attachCustomerSalesTotals };
