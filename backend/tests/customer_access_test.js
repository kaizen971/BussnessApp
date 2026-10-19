const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { checkRole } = require('../authorization');
const { createProjectAccess, OWNER_ROLES, isEmployeeRole, PROJECT_DENIED } = require('../projectAccess');
const mongoose = require('mongoose');

// Exercise the actual route handlers without starting the server or connecting to MongoDB.
const source = fs.readFileSync(require.resolve('../server'), 'utf8');
function setup() {
  const projectId = String(new mongoose.Types.ObjectId());
  const otherProjectId = String(new mongoose.Types.ObjectId());
  const rows = Array.from({ length: 15 }, (_, i) => ({
    _id: String(i), name: `Alice ${i}`, phone: 'secret', email: 'secret@example.com',
    notes: 'confidentiel', projectId, totalPurchases: 100,
  }));
  rows.push({ _id: 'foreign', name: 'Autre', projectId: otherProjectId });
  class Customer {
    constructor(data) { Object.assign(this, data, { _id: 'created' }); }
    async save() { rows.push(this); }
    static find(filter) {
      let fields;
      const query = {
        select(value) { fields = value.split(' '); return this; },
        sort() { return this; },
        async lean() {
          return rows.filter(c => (typeof filter.projectId === 'string' ? c.projectId === filter.projectId : filter.projectId.$in.includes(c.projectId)) && (!filter.name || filter.name.test(c.name)))
            .map(c => fields ? Object.fromEntries(fields.map(k => [k, c[k]])) : { ...c });
        },
      };
      return query;
    }
  }
  const access = createProjectAccess({ mongoose, Project: {}, User: {} });
  const routes = {};
  const app = Object.fromEntries(['get', 'post', 'put'].map(method => [method, (path, ...handlers) => {
    routes[`${method} ${path}`] = handlers;
  }]));
  vm.runInNewContext(source.slice(source.indexOf('// Customers Routes'), source.indexOf('// IMPORT CSV')), {
    app, Customer, authenticateToken: (req, res, next) => next(), checkRole,
    ...access, OWNER_ROLES, isEmployeeRole, PROJECT_DENIED,
    attachCustomerSalesTotals: async () => {}, Sale: {}, console: { log() {}, error() {} },
  });
  async function call(method, path, { role = 'cashier', query = {}, body = {} } = {}) {
    const req = { user: { role, projectId }, query, body, accessibleProjectIds: [projectId] };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; } };
    const handlers = routes[`${method} /BussnessApp${path}`];
    const run = async index => { if (handlers[index]) await handlers[index](req, res, () => run(index + 1)); };
    await run(0);
    return res;
  }
  return { call, rows, projectId, otherProjectId };
}

test('vendeur : liste complète sans coordonnées ni historique', async () => {
  const { call } = setup();
  const res = await call('get', '/customers');
  assert.equal(res.body.data.length, 15);
  for (const c of res.body.data) assert.deepEqual(Object.keys(c).sort(), ['_id', 'name']);
});

test('recherche vide, un caractère et caractères spéciaux, sans limite de 10', async () => {
  const { call } = setup();
  for (const q of ['', 'a']) {
    const res = await call('get', '/customers/search', { query: { q } });
    assert.equal(res.body.data.length, 15);
    assert.deepEqual(Object.keys(res.body.data[0]).sort(), ['_id', 'name']);
  }
  assert.equal((await call('get', '/customers/search', { query: { q: '.*' } })).body.data.length, 0);
});

test('vendeur : ajout avec nom uniquement, même si des coordonnées sont envoyées', async () => {
  const { call, rows, projectId } = setup();
  const res = await call('post', '/customers', { body: { name: ' Bob ', projectId, phone: 'secret', email: 'secret@example.com' } });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.data, { _id: 'created', name: 'Bob' });
  assert.equal(rows.at(-1).phone, undefined);
  assert.equal(rows.at(-1).email, undefined);
});

test('refuse les accès et créations dans un autre business ainsi que la modification vendeur', async () => {
  const { call, otherProjectId } = setup();
  for (const path of ['/customers', '/customers/search']) {
    assert.equal((await call('get', path, { query: { projectId: otherProjectId } })).statusCode, 403);
  }
  assert.equal((await call('post', '/customers', { body: { name: 'Bob', projectId: otherProjectId } })).statusCode, 403);
  assert.equal((await call('put', '/customers/:id')).statusCode, 403);
});

test('encadrement : conserve les coordonnées à la lecture et à la création', async () => {
  const { call, projectId } = setup();
  for (const role of OWNER_ROLES) {
    assert.equal((await call('get', '/customers', { role })).body.data[0].phone, 'secret');
    const res = await call('post', '/customers', { role, body: { name: 'Bob', projectId, phone: '123', email: 'b@example.com' } });
    assert.equal(res.body.data.phone, '123');
    assert.equal(res.body.data.email, 'b@example.com');
  }
});

test('ventes vendeur : projection client sans coordonnées', async () => {
  for (const method of ['get', 'post']) {
    const start = source.indexOf(`app.${method}('/BussnessApp/sales',`);
    const end = source.indexOf('\napp.', start + 1);
    const route = source.slice(start, end);
    const selections = [...route.matchAll(/\.populate\('customerId', ([^\n]+)\)/g)];
    assert.equal(selections.length, 1);
    for (const role of ['cashier', 'admin']) {
      const projection = vm.runInNewContext(selections[0][1], { req: { user: { role } }, isEmployeeRole });
      assert.equal(projection, role === 'cashier' ? 'name' : method === 'get' ? 'name phone email' : 'name phone');
    }
  }
});
