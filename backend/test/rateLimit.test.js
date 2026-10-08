require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const createRateLimiter = require('../src/middleware/rateLimit');

const call = (mw, ip) => {
  const headers = {};
  let nextArg;
  mw({ ip }, { setHeader: (k, v) => { headers[k] = v; } }, (e) => { nextArg = e; });
  return { headers, err: nextArg };
};

test('allows up to the limit then returns 429, per client key', () => {
  const mw = createRateLimiter({ limit: 3, windowMs: 60000 });
  for (let i = 0; i < 3; i++) assert.equal(call(mw, '10.0.0.1').err, undefined);
  const blocked = call(mw, '10.0.0.1');
  assert.equal(blocked.err.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
  assert.equal(call(mw, '10.0.0.2').err, undefined, 'other clients are unaffected');
});

test('limiters are isolated: traffic through one never consumes another one\'s budget', () => {
  const global = createRateLimiter({ limit: 100 });
  const auth = createRateLimiter({ limit: 3 });
  for (let i = 0; i < 50; i++) assert.equal(call(global, '10.9.9.9').err, undefined);
  for (let i = 0; i < 3; i++) assert.equal(call(auth, '10.9.9.9').err, undefined, `auth attempt ${i + 1} must be allowed`);
  assert.equal(call(auth, '10.9.9.9').err.statusCode, 429);
});

test('window resets after it expires', async () => {
  const mw = createRateLimiter({ limit: 1, windowMs: 40 });
  assert.equal(call(mw, '10.8.8.8').err, undefined);
  assert.equal(call(mw, '10.8.8.8').err.statusCode, 429);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(call(mw, '10.8.8.8').err, undefined);
});
