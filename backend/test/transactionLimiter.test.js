require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { perUserTransactionLimiter } = require('../src/middleware/limiters');

const hit = (req) => { let err; perUserTransactionLimiter(req, { setHeader() {} }, (e) => { err = e; }); return err; };

test('money-movement limit is per user, not per IP', () => {
  const sameOffice = '198.51.100.20'; // two customers behind one NAT
  const alice = { ip: sameOffice, user: { _id: 'alice-id' } };
  const bob = { ip: sameOffice, user: { _id: 'bob-id' } };

  for (let i = 0; i < 30; i++) assert.equal(hit(alice), undefined, `alice request ${i + 1}`);
  assert.equal(hit(alice).statusCode, 429, 'alice is capped after 30/min');
  assert.equal(hit(bob), undefined, 'bob, same IP, is unaffected by alice');
});

test('falls back to the IP if no user is attached (never throws)', () => {
  assert.doesNotThrow(() => hit({ ip: '203.0.113.99' }));
});
