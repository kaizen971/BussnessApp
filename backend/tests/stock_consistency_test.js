const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { installStockConsistency, resolveStockProducts, productStockFilter, archiveStock, findRefundStock, findProductStock, syncProductStock } = require('../stockConsistency');

const sift = require('sift').default;
const matches = (row, filter) => sift(filter)(row);
const product = { _id: new mongoose.Types.ObjectId(), projectId: new mongoose.Types.ObjectId(), name: 'Riz', unitPrice: 500 };
const stock = (extra = {}) => ({ _id: new mongoose.Types.ObjectId(), projectId: product.projectId, productId: product._id, name: 'Riz', quantity: 10, unitPrice: 300, ...extra });
const Product = { find: filter => ({ select: () => ({ lean: async () => [product].filter(p => matches(p, filter)) }) }) };

test('300 → 500 : stock courant revalorisé, quantités et historique inchangés', async () => {
  const rows = [stock(), stock({ productId: undefined })];
  const history = [{ unitPrice: 300, quantity: 2, amount: 600 }, { unitPrice: 500, quantity: 1, amount: 500 }];
  const snapshot = structuredClone(history);
  await resolveStockProducts(rows, Product);
  assert.deepEqual(rows.map(s => s.quantity * s.unitPrice), [5000, 5000]);
  assert.equal(String(rows[1].productId), String(product._id));
  assert.deepEqual(history, snapshot);
});

test('ne rattache ni un autre produit, ni un autre projet, ni un nom ambigu', async () => {
  const rows = [stock({ productId: new mongoose.Types.ObjectId() }), stock({ projectId: new mongoose.Types.ObjectId() })];
  await resolveStockProducts(rows, Product);
  assert.deepEqual(rows.map(s => s.unitPrice), [300, 300]);
  const legacy = stock({ productId: null });
  const duplicateProduct = { find: () => ({ select: () => ({ lean: async () => [product, { ...product, _id: new mongoose.Types.ObjectId() }] }) }) };
  await resolveStockProducts([legacy], duplicateProduct);
  assert.equal(legacy.unitPrice, 300);
  assert.deepEqual(productStockFilter(product).$or[1], { name: 'Riz', productId: null });
});

// Exercise actual Mongoose query/document middleware with an in-memory driver.
const db = mongoose.createConnection();
db.readyState = 1;
const stored = [stock()];
const clone = row => row && { ...row };
const driver = {
  find: filter => ({ toArray: async () => stored.filter(row => matches(row, filter)).map(clone) }),
  findOne: async filter => clone(stored.find(row => matches(row, filter))),
  updateOne: async (filter, update) => {
    const row = stored.find(row => matches(row, filter));
    if (row) Object.assign(row, update.$set);
    return { acknowledged: true, matchedCount: row ? 1 : 0 };
  },
  findOneAndUpdate: async (filter, update) => {
    const row = stored.find(row => matches(row, filter));
    if (!row) return null;
    Object.assign(row, update.$set);
    return clone(row);
  },
};
db.db = { collection: () => driver };
const schema = new mongoose.Schema({ projectId: mongoose.Schema.Types.ObjectId, productId: mongoose.Schema.Types.ObjectId, name: String, quantity: Number, unitPrice: Number, updatedAt: Date });
installStockConsistency(schema);
const Stock = db.model('Stock', schema);
const model = db.model.bind(db);
db.model = name => name === 'Product' ? Product : model(name);

test('middleware : lectures lean, modification du stock et archivage', async () => {
  const rows = await Stock.find({ projectId: product.projectId }).lean();
  assert.equal(rows[0].unitPrice, 500);
  assert.equal(stored[0].unitPrice, 300); // Read repair is not a hidden database write.
  const updated = await Stock.findByIdAndUpdate(stored[0]._id, { unitPrice: 1, quantity: 9 }, { new: true });
  assert.equal(updated.unitPrice, 500);
  assert.equal(stored[0].unitPrice, 500);
  assert.equal(stored[0].quantity, 9);
  await archiveStock(updated);
  assert.ok(stored[0].archivedAt instanceof Date);
  assert.equal(stored[0].quantity, 9);
  assert.equal(await Stock.findById(stored[0]._id), null);
  assert.deepEqual(await Stock.find({ projectId: product.projectId }), []);
});

test('remboursement : retrouve le stock archivé original, même après recréation', async () => {
  const replacement = stock({ unitPrice: 500, quantity: 20 });
  stored.push(replacement);
  const sale = { _id: new mongoose.Types.ObjectId(), projectId: product.projectId, productId: product, unitPrice: 300, amount: 600, quantity: 2 };
  const StockMovement = { findOne: async filter => {
    assert.equal(filter.saleId, sale._id);
    assert.equal(filter.projectId, product.projectId);
    return { stockId: stored[0]._id };
  } };
  const original = await findRefundStock({ Stock, StockMovement, sale });
  assert.equal(String(original._id), String(stored[0]._id));
  original.quantity += sale.quantity;
  await original.save();
  assert.equal(stored[0].quantity, 11);
  assert.equal(replacement.quantity, 20);
  assert.equal(sale.unitPrice, 300);
  assert.equal(sale.amount, 600);
  assert.equal((await Stock.find({})).length, 1);
});

test('création/import : la validation reprend le prix produit et accepte zéro', async () => {
  const created = new Stock(stock({ unitPrice: 1 }));
  await created.validate();
  assert.equal(created.unitPrice, 500);
  try {
    product.unitPrice = 0;
    const free = new Stock(stock({ unitPrice: 300 }));
    await free.validate();
    assert.equal(free.unitPrice, 0);
  } finally {
    product.unitPrice = 500;
  }
});

test('ancienne vente sans mouvement : recherche de secours dans le stock actif', async () => {
  const active = await findRefundStock({
    Stock, Product, StockMovement: { findOne: async () => null },
    sale: { _id: new mongoose.Types.ObjectId(), projectId: product.projectId, productId: product },
  });
  assert.ok(active);
  assert.equal(active.archivedAt, null);
  assert.equal(active.quantity, 20);
});

test('une archive conserve son prix et son nom après modification du produit', async () => {
  const previousPrice = product.unitPrice;
  const previousName = product.name;
  try {
    product.unitPrice = 700;
    product.name = 'Nouveau nom';
    const archived = await Stock.findById(stored[0]._id).setOptions({ includeArchived: true });
    assert.equal(archived.unitPrice, 500);
    assert.equal(archived.name, 'Riz');
    archived.quantity += 1;
    await archived.save();
    assert.equal(stored[0].unitPrice, 500);
    assert.equal(stored[0].name, 'Riz');
    const active = await Stock.findById(stored[1]._id).lean();
    assert.equal(active.unitPrice, 700);
    assert.equal(active.name, 'Nouveau nom');
  } finally {
    product.unitPrice = previousPrice;
    product.name = previousName;
  }
});

test('synchronisation produit : protège archives, autres projets et liens explicites', async () => {
  const rows = [
    stock(), stock({ productId: null }),
    stock({ archivedAt: new Date(), unitPrice: 200 }),
    stock({ productId: new mongoose.Types.ObjectId() }),
    stock({ projectId: new mongoose.Types.ObjectId() }),
  ];
  const Stock = { updateMany: async (filter, update) => {
    for (const row of rows.filter(s => matches(s, filter))) Object.assign(row, update.$set);
  } };
  await syncProductStock({ Stock, Product: { exists: async () => false }, product, oldName: 'Riz' });
  assert.deepEqual(rows.map(s => s.unitPrice), [500, 500, 200, 300, 300]);
  assert.equal(String(rows[1].productId), String(product._id));
});

test('synchronisation produit : un homonyme ne récupère pas un ancien stock sans lien', async () => {
  const legacy = stock({ productId: null });
  await syncProductStock({
    Product: { exists: async filter => {
      assert.equal(filter.projectId, product.projectId);
      assert.equal(filter._id.$ne, product._id);
      return true;
    } },
    Stock: { updateMany: async (filter, update) => {
      if (matches(legacy, filter)) Object.assign(legacy, update.$set);
    } }, product, oldName: 'Riz',
  });
  assert.equal(legacy.unitPrice, 300);
  assert.equal(legacy.productId, null);
});

test('recherche vente : priorité au lien explicite, aucun choix arbitraire par nom', async () => {
  const legacy = stock({ productId: null });
  const linked = stock();
  const rows = [legacy, linked];
  const Stock = { findOne: async filter => rows.find(row => matches(row, filter)) || null };
  const Product = { exists: async () => true };
  assert.equal(await findProductStock({ Stock, Product, product }), linked);
  rows.pop();
  assert.equal(await findProductStock({ Stock, Product, product }), null);
  Product.exists = async () => false;
  assert.equal(await findProductStock({ Stock, Product, product }), legacy);
});

test('remboursement sans produit ni mouvement : aucune fiche arbitraire modifiée', async () => {
  const result = await findRefundStock({
    Stock: { findOne: () => { throw new Error('unexpected query'); } },
    StockMovement: { findOne: async () => null }, Product,
    sale: { _id: 'sale', projectId: product.projectId, productId: null },
  });
  assert.equal(result, null);
});

for (const scenario of [
  { name: 'autorise l’historique archivé du projet accessible', access: true, status: 200 },
  { name: 'refuse l’historique archivé d’un autre projet', access: false, status: 404 },
  { name: 'refuse un identifiant de stock invalide', access: true, invalid: true, status: 404 },
]) {
  test(scenario.name, async () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const source = fs.readFileSync(require.resolve('../server'), 'utf8');
    const start = source.indexOf("app.get('/BussnessApp/stock/:id/movements'");
    const end = source.indexOf('// Obtenir tous les mouvements de stock', start);
    let handler;
    let reads = 0;
    const chain = { populate() { return this; }, sort: async () => [{ type: 'sale', unitPrice: 300 }] };
    vm.runInNewContext(source.slice(start, end), {
      app: { get: (path, ...handlers) => { handler = handlers.at(-1); } },
      mongoose, authenticateToken() {}, checkRole: () => () => {}, OWNER_ROLES: ['manager'],
      Stock: { findById: id => ({ setOptions: async options => {
        assert.equal(scenario.invalid, undefined);
        assert.equal(options.includeArchived, true);
        return { _id: id, projectId: product.projectId, archivedAt: new Date() };
      } }) },
      canAccessProject: async (req, projectId) => {
        assert.equal(String(projectId), String(product.projectId));
        return scenario.access;
      },
      StockMovement: { find: filter => { reads++; assert.ok(filter.stockId); return chain; } },
      console,
    });
    const req = { params: { id: scenario.invalid ? 'invalid-id' : String(stored[0]._id) } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler(req, res);
    assert.equal(res.statusCode, scenario.status);
    assert.equal(reads, scenario.status === 200 ? 1 : 0);
    if (scenario.status === 200) assert.equal(res.body.data[0].unitPrice, 300);
  });
}

for (const scenario of [
  { name: 'import stock : homonymes produits', products: [product, { ...product, name: ' riz ' }], stocks: [], kind: 'stock' },
  { name: 'import stock : doublons de fiches', products: [product], stocks: [stock(), stock()], kind: 'stock' },
  { name: 'import ventes : homonymes produits', products: [product, { ...product, name: ' riz ' }], stocks: [], kind: 'sales' },
]) {
  test(scenario.name, async () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const source = fs.readFileSync(require.resolve('../server'), 'utf8');
    const helpers = source.slice(source.indexOf('const csvNameKey ='), source.indexOf('const createStockEntryMovement ='));
    const stockImport = source.slice(source.indexOf('const importStockCsv ='), source.indexOf('const importSalesCsv ='));
    const salesImport = source.slice(source.indexOf('const importSalesCsv ='), source.indexOf('const importCustomersCsv ='));
    const context = {
      Product: { find: () => ({ select: () => ({ lean: async () => scenario.products }) }) },
      Stock: { find: async () => scenario.stocks },
      Customer: { find: async () => [] },
      parseCsvNumber: value => Number(value),
      records: [{ _line: 2, name: 'Riz', productName: 'Riz', quantity: '2', unitPrice: '300' }],
      options: { projectId: product.projectId, userId: 'actor', options: {} },
    };
    const result = await vm.runInNewContext(helpers + stockImport + salesImport +
      (scenario.kind === 'stock' ? 'importStockCsv(records, options)' : 'importSalesCsv(records, options)'), context);
    assert.equal(result.inserted, 0);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /ambigu/);
    assert.equal(result.errors[0].line, 2);
  });
}
