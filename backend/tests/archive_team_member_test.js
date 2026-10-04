const assert = require('node:assert/strict');
const { createArchiveTeamMemberHandler } = require('../archiveTeamMember');

const makeResponse = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const run = async (overrides = {}) => {
  const target = {
    _id: 'target', projectId: 'project', projectIds: [],
    role: 'cashier', fullName: 'Marie Dupont', username: 'marie',
    email: 'marie@example.com', isActive: true, deletedAt: null,
    save: async function () { this.saved = true; },
    ...overrides.target,
  };
  const checks = { futureSchedule: false, ownsProject: false, access: true, ...overrides.checks };
  const handler = createArchiveTeamMemberHandler({
    User: { findById: async () => target },
    Project: { exists: async () => checks.ownsProject },
    Schedule: { exists: async () => checks.futureSchedule },
    canAccessProject: async () => checks.access,
  });
  const req = {
    params: { id: 'target' },
    user: { id: 'admin', role: 'admin', ...overrides.actor },
    body: { projectId: 'project', confirmation: 'Marie Dupont', ...overrides.body },
  };
  const res = makeResponse();
  await handler(req, res);
  return { target, res };
};

(async () => {
  const success = await run();
  assert.equal(success.res.statusCode, 200);
  assert.equal(success.target.saved, true);
  assert.equal(success.target.isActive, false);
  assert.ok(success.target.deletedAt instanceof Date);
  assert.equal(success.target.fullName, 'Marie Dupont');
  assert.equal(success.target.projectId, 'project');
  assert.notEqual(success.target.email, 'marie@example.com');

  for (const [options, expected] of [
    [{ body: { confirmation: 'wrong' } }, 400],
    [{ actor: { id: 'target' } }, 400],
    [{ target: { role: 'admin' } }, 403],
    [{ checks: { access: false } }, 403],
    [{ checks: { ownsProject: true } }, 409],
    [{ checks: { futureSchedule: true } }, 409],
    [{ actor: { role: 'manager' }, target: { role: 'manager' } }, 403],
    [{ target: { projectIds: ['another-project'] } }, 409],
  ]) {
    const { target, res } = await run(options);
    assert.equal(res.statusCode, expected);
    assert.equal(target.saved, undefined);
  }

  console.log('Archive team member: success and 8 refusal cases passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
