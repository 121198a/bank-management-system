const getDecimal128 = () => require('mongoose').Types.Decimal128;

const MONEY_SCALE = 2;
const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const normalizeMoneyString = (value, { allowZero = false } = {}) => {
  if (value === undefined || value === null) throw new Error('Amount is required');
  const raw = typeof value === 'number' ? String(value) : String(value).trim();
  if (!MONEY_PATTERN.test(raw)) {
    throw new Error('Amount must be a valid positive decimal with at most 2 decimal places');
  }
  const [whole, fraction = ''] = raw.split('.');
  const minor = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, MONEY_SCALE));
  if (!allowZero && minor <= 0n) throw new Error('Amount must be greater than zero');
  if (allowZero && minor < 0n) throw new Error('Amount cannot be negative');
  return `${whole}.${(fraction + '00').slice(0, MONEY_SCALE)}`;
};

const toDecimal128 = (value, options) => {
  const normalized = normalizeMoneyString(value, options);
  return getDecimal128().fromString(normalized);
};

const decimalToString = (value) => {
  if (value === undefined || value === null) return '0.00';
  const raw = typeof value === 'string' ? value : value.toString();
  return normalizeMoneyString(raw, { allowZero: true });
};

const decimalToMinor = (value) => {
  const normalized = decimalToString(value);
  const [whole, fraction] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt(fraction);
};

const minorToDecimal = (minor) => {
  if (typeof minor !== 'bigint') throw new TypeError('minor must be a BigInt');
  if (minor < 0n) throw new Error('Money amount cannot be negative');
  const whole = minor / 100n;
  const fraction = String(minor % 100n).padStart(2, '0');
  return getDecimal128().fromString(`${whole}.${fraction}`);
};

const addMoney = (a, b) => minorToDecimal(decimalToMinor(a) + decimalToMinor(b));
const subtractMoney = (a, b) => {
  const result = decimalToMinor(a) - decimalToMinor(b);
  if (result < 0n) throw new Error('Money amount cannot be negative');
  return minorToDecimal(result);
};
const compareMoney = (a, b) => {
  const left = decimalToMinor(a);
  const right = decimalToMinor(b);
  return left === right ? 0 : left > right ? 1 : -1;
};

const minorToString = (minor) => {
  if (typeof minor !== 'bigint' || minor < 0n) throw new Error('Invalid minor-unit value');
  return `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`;
};

const moneyToJSON = (value) => Number(decimalToString(value));

module.exports = {
  MONEY_SCALE,
  normalizeMoneyString,
  toDecimal128,
  decimalToString,
  decimalToMinor,
  minorToDecimal,
  addMoney,
  subtractMoney,
  compareMoney,
  minorToString,
  moneyToJSON
};
