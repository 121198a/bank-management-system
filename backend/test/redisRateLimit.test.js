require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const Redis = require('ioredis');
const createRateLimiter = require('../src/middleware/rateLimit');
const createRedisStore = require('../src/middleware/redisRateLimitStore');

const URL = process.env.TEST_REDIS_URL;
const skip = URL ? undefined : 'set TEST_REDIS_URL to run Redis rate-limit tests';

const call = (mw, ip) => new Promise((resolve) => {
  const headers = {};
  mw({ ip }, { setHeader: (k, v) => { headers[k] = v; } }, (err) => resolve({ err, headers }));
});

let redis;
let store;
let prefix;
test.before(() => {
  if (!URL) return;
  redis = new Redis(URL, { maxRetriesPerRequest: 1 });
  prefix = `rltest:${process.pid}:${Date.now()}`;
  store = createRedisStore(redis, { prefix });
});
test.after(async () => {
  if (!redis) return;
  const keys = await redis.keys(`${prefix}:*`);
  if (keys.length) await redis.del(keys);
  await redis.quit();
});

test('enforces the limit through Redis and sets Retry-After', { skip }, async () => {
  const mw = createRateLimiter({ limit: 3, name: 'basic', store });
  for (let i = 0; i < 3; i++) assert.equal((await call(mw, '1.1.1.1')).err, undefined);
  const blocked = await call(mw, '1.1.1.1');
  assert.equal(blocked.err.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) >= 1);
  assert.equal((await call(mw, '2.2.2.2')).err, undefined, 'other clients unaffected');
});

test('limit is shared across separate app instances (the point of using Redis)', { skip }, async () => {
  // Two limiter objects = two server processes with their own memory but one Redis.
  const instanceA = createRateLimiter({ limit: 4, name: 'shared', store });
  const instanceB = createRateLimiter({ limit: 4, name: 'shared', store });
  for (let i = 0; i < 2; i++) assert.equal((await call(instanceA, '3.3.3.3')).err, undefined);
  for (let i = 0; i < 2; i++) assert.equal((await call(instanceB, '3.3.3.3')).err, undefined);
  assert.equal((await call(instanceA, '3.3.3.3')).err.statusCode, 429, 'A must see the hits B recorded');
  assert.equal((await call(instanceB, '3.3.3.3')).err.statusCode, 429);
});

test('concurrent requests cannot race past the limit (atomic counting)', { skip }, async () => {
  const mw = createRateLimiter({ limit: 10, name: 'race', store });
  const results = await Promise.all(Array.from({ length: 40 }, () => call(mw, '4.4.4.4')));
  assert.equal(results.filter((r) => !r.err).length, 10, 'exactly `limit` requests may pass');
  assert.equal(results.filter((r) => r.err?.statusCode === 429).length, 30);
});

test('named limiters do not share counters', { skip }, async () => {
  const a = createRateLimiter({ limit: 1, name: 'nameA', store });
  const b = createRateLimiter({ limit: 1, name: 'nameB', store });
  assert.equal((await call(a, '5.5.5.5')).err, undefined);
  assert.equal((await call(b, '5.5.5.5')).err, undefined);
});

test('window expires in Redis', { skip }, async () => {
  const mw = createRateLimiter({ limit: 1, windowMs: 150, name: 'expiry', store });
  assert.equal((await call(mw, '6.6.6.6')).err, undefined);
  assert.equal((await call(mw, '6.6.6.6')).err.statusCode, 429);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal((await call(mw, '6.6.6.6')).err, undefined);
});

// This one needs no Redis server: it proves an outage degrades safely instead of crashing or failing open.
test('Redis outage falls back to the in-memory limiter (still limits, never throws)', async () => {
  const dead = new Redis('redis://127.0.0.1:1', { maxRetriesPerRequest: 0, enableOfflineQueue: false, lazyConnect: true, retryStrategy: () => null });
  dead.on('error', () => {});
  const originalError = console.error;
  console.error = () => {};
  try {
    const mw = createRateLimiter({ limit: 2, name: 'down', store: createRedisStore(dead) });
    assert.equal((await call(mw, '7.7.7.7')).err, undefined);
    assert.equal((await call(mw, '7.7.7.7')).err, undefined);
    assert.equal((await call(mw, '7.7.7.7')).err.statusCode, 429, 'fallback must still enforce the limit');
  } finally {
    console.error = originalError;
    dead.disconnect();
  }
});
