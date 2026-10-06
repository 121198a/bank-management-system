require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let server; let base;
test.before(async () => {
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((r) => server.close(r)));

test('health endpoint is public and sends hardened headers', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy') || '', /default-src 'none'/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.ok(res.headers.get('x-request-id'));
});

test('readiness reports 503 when the database is not connected', async () => {
  const res = await fetch(`${base}/api/ready`);
  assert.equal(res.status, 503);
});

test('unknown routes return a controlled JSON 404', async () => {
  const res = await fetch(`${base}/api/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.stack, undefined);
});

test('every protected module rejects anonymous requests with 401 (no DB needed)', async () => {
  const paths = ['users', 'accounts', 'transactions', 'kyc', 'notifications', 'audit', 'dashboard/stats',
    'employees', 'branches', 'loans', 'insurance/policies', 'collections', 'departments', 'sales', 'security/events'];
  for (const p of paths) {
    const res = await fetch(`${base}/api/${p}`);
    assert.ok([401, 404].includes(res.status), `${p} -> ${res.status}`);
    assert.notEqual(res.status, 200, `${p} must not be public`);
  }
});

test('malformed Bearer token is rejected with 401', async () => {
  const res = await fetch(`${base}/api/accounts`, { headers: { Authorization: 'Bearer not.a.jwt' } });
  assert.equal(res.status, 401);
});

test('oversized JSON bodies are rejected before reaching handlers', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(1_200_000) })
  });
  assert.equal(res.status, 413);
});

test('auth endpoints are rate limited', async () => {
  let last;
  for (let i = 0; i < 14; i++) {
    last = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  }
  assert.equal(last.status, 429);
});
