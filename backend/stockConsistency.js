// Product is the source of the current selling price. Sales and movements keep
// their own historical prices and must never be repriced by these hooks.
const unlinkedStockByName = (name) => ({ name, productId: null });
const productStockFilter = (product, oldName = product.name, includeLegacy = true) => ({
  projectId: product.projectId,
  archivedAt: null,
  $or: [{ productId: product._id }, ...(includeLegacy ? [unlinkedStockByName(oldName)] : [])],
});

async function resolveStockProducts(stocks, Product) {
  const rows = stocks.filter(s => s && s.projectId && !s.archivedAt && (s.productId || s.name));
  if (!rows.length) return;
  const products = await Product.find({
    $or: rows.map(s => ({ projectId: s.projectId, ...(s.productId
      ? { _id: s.productId._id || s.productId }
      : { name: s.name }) })),
  }).select('_id projectId name unitPrice').lean();
  const byId = new Map(products.map(p => [`${p.projectId}:${p._id}`, p]));
  const byName = new Map();
  for (const p of products) {
    const key = `${p.projectId}:${p.name}`;
    // Do not guess when several legacy products have the same name.
    byName.set(key, byName.has(key) ? null : p);
  }
  for (const stock of rows) {
    const product = stock.productId
      ? byId.get(`${stock.projectId}:${stock.productId._id || stock.productId}`)
      : byName.get(`${stock.projectId}:${stock.name}`);
    if (!product) continue;
    stock.name = product.name;
    stock.unitPrice = product.unitPrice;
    if (!stock.productId) stock.productId = product._id;
  }
}

function installStockConsistency(schema) {
  schema.add({ archivedAt: { type: Date, default: null } });
  // Applies equally to lists, dashboards, exports, CSV imports and sale lookup.
  schema.pre(/^find/, function () {
    if (!this.getOptions().includeArchived) this.where({ archivedAt: null });
    delete this.options.includeArchived;
  });
  for (const operation of ['find', 'findOne', 'findOneAndUpdate']) {
    schema.post(operation, async function (result) {
      await resolveStockProducts(Array.isArray(result) ? result : [result], this.model.db.model('Product'));
    });
  }
  schema.pre('validate', async function () {
    await resolveStockProducts([this], this.constructor.db.model('Product'));
  });
  schema.pre('findOneAndUpdate', async function () {
    const existing = await this.model.findOne(this.getFilter());
    if (!existing) return;
    const update = this.getUpdate();
    const next = { ...existing.toObject(), ...(update.$set || update) };
    await resolveStockProducts([next], this.model.db.model('Product'));
    const fields = { name: next.name, unitPrice: next.unitPrice, productId: next.productId };
    if (update.$set) Object.assign(update.$set, fields);
    else Object.assign(update, fields);
  });
}

async function archiveStock(stock) {
  stock.archivedAt = new Date();
  stock.updatedAt = stock.archivedAt;
  await stock.save();
}

// Prefer explicit references. Legacy names are usable only when unambiguous.
async function findProductStock({ Stock, Product, product }) {
  if (!product) return null;
  const linked = await Stock.findOne({ projectId: product.projectId, productId: product._id });
  if (linked) return linked;
  if (!product.name || await Product.exists({
    projectId: product.projectId, name: product.name, _id: { $ne: product._id },
  })) return null;
  return Stock.findOne({ projectId: product.projectId, ...unlinkedStockByName(product.name) });
}

async function syncProductStock({ Stock, Product, product, oldName }) {
  const ambiguous = await Product.exists({
    projectId: product.projectId, name: oldName, _id: { $ne: product._id },
  });
  await Stock.updateMany(
    productStockFilter(product, oldName, !ambiguous),
    { $set: { name: product.name, unitPrice: product.unitPrice,
      productId: product._id, updatedAt: Date.now() } }
  );
}

async function findRefundStock({ Stock, StockMovement, Product, sale }) {
  const movement = await StockMovement.findOne({
    projectId: sale.projectId, saleId: sale._id, type: 'sale',
  });
  return movement
    ? Stock.findOne({ _id: movement.stockId, projectId: sale.projectId })
      .setOptions({ includeArchived: true })
    : findProductStock({ Stock, Product, product: sale.productId });
}

module.exports = { installStockConsistency, resolveStockProducts, productStockFilter,
  archiveStock, findRefundStock, findProductStock, syncProductStock };
