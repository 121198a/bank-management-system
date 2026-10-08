const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeMoneyString,
  toDecimal128,
  decimalToString,
  addMoney,
  subtractMoney,
  compareMoney,
  decimalToMinor,
  minorToString,
  percentageOf
} = require('../src/utils/money');

test('money parsing preserves two-decimal precision', () => {
  assert.equal(normalizeMoneyString('100.10'), '100.10');
  assert.equal(decimalToMinor('100.10'), 10010n);
  assert.equal(minorToString(decimalToMinor('0.10') + decimalToMinor('0.20')), '0.30');
  assert.equal(minorToString(decimalToMinor('10.00') - decimalToMinor('0.10')), '9.90');
  assert.equal(compareMoney('9.99', '10.00'), -1);
});

test('money rejects malformed and negative values', () => {
  assert.throws(() => normalizeMoneyString('1.001'), /valid positive decimal/);
  assert.throws(() => normalizeMoneyString('-1.00'), /valid positive decimal/);
  assert.throws(() => normalizeMoneyString('0.00'), /greater than zero/);
});

test('percentageOf computes without float drift', () => {
  assert.equal(decimalToString(percentageOf(toDecimal128('500000.00'), 2.5)), '12500.00');
  assert.equal(decimalToString(percentageOf(toDecimal128('333.33'), 12.75)), '42.49');
  assert.equal(decimalToString(percentageOf(toDecimal128('999999.99'), 0.1)), '999.99');
});

test('malformed amounts are client errors (400), never an opaque 500', () => {
  const ApiError = require('../src/utils/ApiError');
  for (const bad of ['10.', '.5', '+5', '007', '1e3', 'abc', '', '-5', '0', '1.234']) {
    assert.throws(
      () => normalizeMoneyString(bad),
      (err) => err instanceof ApiError && err.statusCode === 400,
      `"${bad}" must raise ApiError(400)`
    );
  }
});

test('malformed amounts reach the client as a 400 through the real error handler', () => {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'a'.repeat(40);
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(40);
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1/unused';
  const errorHandler = require('../src/middleware/errorHandler');
  let caught;
  try { toDecimal128('10.'); } catch (e) { caught = e; }
  const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  errorHandler(caught, { method: 'POST', originalUrl: '/api/transactions/deposit' }, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /valid positive decimal/);
});
