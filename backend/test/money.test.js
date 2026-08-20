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
