require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const authorize = require('../src/middleware/rbac');

const run = (mw, req) => { let e; mw(req, {}, (x) => { e = x; }); return e; };

test('authorize rejects unauthenticated requests with 401', () => {
  assert.equal(run(authorize('admin'), {}).statusCode, 401);
});
test('authorize rejects wrong roles with 403 and allows right roles', () => {
  assert.equal(run(authorize('admin'), { user: { role: 'customer' } }).statusCode, 403);
  assert.equal(run(authorize('admin', 'employee'), { user: { role: 'employee' } }), undefined);
});
test('a browser-supplied role header/body can never grant access', () => {
  const req = { user: { role: 'customer' }, headers: { 'x-role': 'admin' }, body: { role: 'admin' } };
  assert.equal(run(authorize('admin'), req).statusCode, 403);
});
