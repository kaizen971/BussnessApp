/**
 * Tests du cloisonnement des données entre business (projectAccess.js)
 * Usage : node tests/project_access_test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { createProjectAccess, isEmployeeRole } = require('../projectAccess');

const id = () => new mongoose.Types.ObjectId();

const ownerA = id();
const ownerB = id();
const projectA1 = id();
const projectA2 = id();
const projectB = id();
const cashierA = id();

const projects = [
  { _id: projectA1, ownerId: ownerA },
  { _id: projectA2, ownerId: ownerA },
  { _id: projectB, ownerId: ownerB },
];
const users = [
  { _id: ownerA, projectId: projectA1, projectIds: [projectA1, projectA2] },
  { _id: ownerB, projectId: projectB, projectIds: [projectB] },
  { _id: cashierA, projectId: projectA1, projectIds: [] },
];
const products = [
  { _id: id(), projectId: projectA2, name: 'Produit A' },
  { _id: id(), projectId: projectB, name: 'Produit B' },
];

const query = (result) => {
  const q = { select: () => q, lean: () => q, populate: () => q, then: (res, rej) => Promise.resolve(result()).then(res, rej) };
  return q;
};
const inIds = (value, ids) => ids.map(String).includes(String(value));

const Project = { find: ({ ownerId }) => query(() => projects.filter((p) => String(p.ownerId) === String(ownerId))) };
const User = {
  findOne: ({ _id, $or }) => query(() => users.find((u) => String(u._id) === String(_id)
    && (inIds(u.projectId, $or[0].projectId.$in) || u.projectIds.some((p) => inIds(p, $or[1].projectIds.$in)))) || null),
};
const Product = { findById: (productId) => query(() => products.find((p) => String(p._id) === String(productId)) || null) };

const access = createProjectAccess({ mongoose, Project, User });
const req = (userId, role, projectId) => ({ user: { id: String(userId), role, projectId } });

test('un propriétaire accède à tous ses business, pas à ceux des autres', async () => {
  const r = req(ownerA, 'admin', projectA1);
  assert.strictEqual(await access.canAccessProject(r, String(projectA1)), true);
  assert.strictEqual(await access.canAccessProject(r, String(projectA2)), true);
  assert.strictEqual(await access.canAccessProject(r, String(projectB)), false);
});

test('un vendeur accède uniquement au business auquel il est rattaché', async () => {
  const r = req(cashierA, 'cashier', projectA1);
  assert.strictEqual(await access.canAccessProject(r, String(projectA1)), true);
  assert.strictEqual(await access.canAccessProject(r, String(projectA2)), false);
});

test('projectScope : sans projet demandé, limite aux business accessibles', async () => {
  const scope = await access.projectScope(req(ownerA, 'admin', projectA1), undefined);
  assert.deepStrictEqual(scope.$in.sort(), [String(projectA1), String(projectA2)].sort());
});

test('projectScope : refuse un business étranger et les valeurs injectées', async () => {
  const r = req(ownerA, 'admin', projectA1);
  assert.strictEqual(await access.projectScope(r, String(projectB)), null);
  assert.strictEqual(await access.projectScope(r, { $ne: null }), null);
  assert.strictEqual(await access.projectScope(r, [String(projectA1)]), null);
  assert.strictEqual(await access.projectScope(r, String(projectA2)), String(projectA2));
});

test('findInProject : un document d\'un autre business est introuvable', async () => {
  const r = req(ownerA, 'admin', projectA1);
  assert.strictEqual((await access.findInProject(r, Product, String(products[0]._id))).name, 'Produit A');
  assert.strictEqual(await access.findInProject(r, Product, String(products[1]._id)), null);
  assert.strictEqual(await access.findInProject(r, Product, 'pas-un-id'), null);
});

test('findUserInProjects : impossible de cibler le compte d\'un autre business', async () => {
  const r = req(ownerA, 'admin', projectA1);
  assert.ok(await access.findUserInProjects(r, String(cashierA)));
  assert.strictEqual(await access.findUserInProjects(r, String(ownerB)), null);
});

test('requireProject répond 403 pour un business étranger', async () => {
  const middleware = access.requireProject((r) => r.params.projectId);
  const r = { ...req(ownerA, 'admin', projectA1), params: { projectId: String(projectB) } };
  let status;
  let nextCalled = false;
  await middleware(r, { status: (code) => { status = code; return { json: () => {} }; } }, () => { nextCalled = true; });
  assert.strictEqual(status, 403);
  assert.strictEqual(nextCalled, false);
});

test('seul le vendeur est un salarié, le manager a les accès d\'encadrement', () => {
  assert.strictEqual(isEmployeeRole('cashier'), true);
  assert.strictEqual(isEmployeeRole('manager'), false);
  assert.strictEqual(isEmployeeRole('admin'), false);
  assert.strictEqual(isEmployeeRole('responsable'), false);
});
