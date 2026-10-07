require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { collectRoutes } = require('../scripts/list-routes');

const routes = collectRoutes();

test('only the intended endpoints are public (guards against accidentally exposed routes)', () => {
  const publicRoutes = routes.filter((r) => r.auth === 'public').map((r) => `${r.method} ${r.path}`).sort();
  assert.deepEqual(publicRoutes, [
    'GET /api/health',
    'GET /api/ready',
    'POST /api/auth/forgot-password',
    'POST /api/auth/login',
    'POST /api/auth/logout',
    'POST /api/auth/refresh',
    'POST /api/auth/register',
    'POST /api/auth/reset-password/:token'
  ].sort());
});

test('user-management writes stay restricted to admin', () => {
  const writes = routes.filter((r) => /^\/api\/users(\/|$)/.test(r.path) && ['POST', 'DELETE'].includes(r.method));
  assert.ok(writes.length > 0, 'expected to find /api/users write routes');
  for (const r of writes) assert.match(r.roles, /admin/, `${r.method} ${r.path} -> ${r.roles}`);
});
