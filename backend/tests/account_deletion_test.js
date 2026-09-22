const test = require('node:test');
const assert = require('node:assert/strict');
const { createDeleteAccountHandler } = require('../accountDeletion');
const { createAuthenticateToken, checkRole } = require('../authorization');

const userId = '507f1f77bcf86cd799439011';

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function setup({ ownsProject = false, validPassword = true } = {}) {
  const calls = [];
  const user = { _id: userId, password: 'hashed', photo: 'profile-photo' };
  const handler = createDeleteAccountHandler({
    User: {
      findById: async (id) => { calls.push(['findUser', id]); return user; },
      findByIdAndDelete: async (id) => { calls.push(['deleteUser', id]); }
    },
    Project: {
      exists: async (filter) => { calls.push(['ownsProject', filter.ownerId]); return ownsProject; }
    },
    Feedback: {
      deleteMany: async (filter) => { calls.push(['deleteFeedback', filter.userId]); }
    },
    Subscription: {
      updateMany: async (filter) => { calls.push(['cancelSubscription', filter.adminId]); }
    },
    bcrypt: {
      compare: async () => validPassword
    },
    deleteS3Image: async (photo) => { calls.push(['deletePhoto', photo]); }
  });
  return { handler, calls };
}

test('employee self-deletion removes the account without touching company records', async () => {
  const { handler, calls } = setup();
  const res = response();
  await handler({ user: { id: userId, role: 'cashier' }, body: { password: 'secret' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [
    ['findUser', userId],
    ['ownsProject', userId],
    ['deleteFeedback', userId],
    ['cancelSubscription', userId],
    ['deleteUser', userId],
    ['deletePhoto', 'profile-photo']
  ]);
});

test('project owner cannot leave an orphaned company project', async () => {
  const { handler, calls } = setup({ ownsProject: true });
  const res = response();
  await handler({ user: { id: userId, role: 'manager' }, body: { password: 'secret' } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'PROJECT_OWNERSHIP_BLOCKS_DELETION');
  assert.deepEqual(calls, [['findUser', userId], ['ownsProject', userId]]);
});

test('wrong password cannot remove account or feedback', async () => {
  const { handler, calls } = setup({ validPassword: false });
  const res = response();
  await handler({ user: { id: userId, role: 'cashier' }, body: { password: 'wrong' } }, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(calls, [['findUser', userId]]);
});

test('role middleware rejects employees from privileged routes', () => {
  const res = response();
  let passed = false;
  checkRole('admin', 'manager')({ user: { role: 'cashier' } }, res, () => { passed = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(passed, false);

  checkRole('admin', 'manager')({ user: { role: 'manager' } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test('a deleted account cannot keep using its existing token', async () => {
  const res = response();
  let passed = false;
  const authenticate = createAuthenticateToken({
    jwt: { verify: (_token, _secret, callback) => callback(null, { id: userId, role: 'admin' }) },
    User: { findById: () => ({ select: async () => null }) },
    secret: 'test-secret'
  });

  authenticate({ headers: { authorization: 'Bearer old-token' } }, res, () => { passed = true; });
  await new Promise(setImmediate);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'ACCOUNT_DELETED');
  assert.equal(passed, false);
});

test('role checks use the current database role, not an old token claim', async () => {
  const res = response();
  const req = { headers: { authorization: 'Bearer old-token' } };
  let passed = false;
  const authenticate = createAuthenticateToken({
    jwt: { verify: (_token, _secret, callback) => callback(null, { id: userId, role: 'manager' }) },
    User: { findById: () => ({ select: async () => ({ role: 'cashier', isActive: true }) }) },
    secret: 'test-secret'
  });

  authenticate(req, res, () => {
    checkRole('admin', 'manager')(req, res, () => { passed = true; });
  });
  await new Promise(setImmediate);

  assert.equal(req.user.role, 'cashier');
  assert.equal(res.statusCode, 403);
  assert.equal(passed, false);
});
