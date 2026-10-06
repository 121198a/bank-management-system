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
