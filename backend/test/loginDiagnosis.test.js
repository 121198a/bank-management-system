require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { diagnose } = require('../scripts/lib/loginDiagnosis');

test('the four failure/success classes match the login controller rules', () => {
  assert.equal(diagnose({ user: null }).code, 'NOT_FOUND');
  assert.equal(diagnose({ user: { isActive: false }, passwordProvided: true, passwordMatches: true }).code, 'INACTIVE');
  assert.equal(diagnose({ user: { isActive: true }, passwordProvided: false }).code, 'FOUND_UNCHECKED');
  assert.equal(diagnose({ user: { isActive: true }, passwordProvided: true, passwordMatches: false }).code, 'WRONG_PASSWORD');
  assert.equal(diagnose({ user: { isActive: true }, passwordProvided: true, passwordMatches: true }).code, 'OK');
});

test('an inactive user is reported as inactive even if the password would match (login refuses first)', () => {
  assert.equal(diagnose({ user: { isActive: false }, passwordProvided: true, passwordMatches: true }).code, 'INACTIVE');
});

test('every non-OK result tells the user what to do next', () => {
  for (const input of [{ user: null }, { user: { isActive: false } }, { user: { isActive: true }, passwordProvided: true, passwordMatches: false }]) {
    assert.ok(diagnose(input).next.length > 0);
  }
});

test('the diagnostic script is read-only: it contains no write calls', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../scripts/check-login.js'), 'utf8');
  assert.ok(!/\.(save|create|insertMany|insertOne|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate|findByIdAndUpdate|drop)\s*\(/.test(src));
  assert.ok(!/console\.log\([^)]*(password|passwordHash)[^)]*\)/i.test(src.replace(/CHECK_PASSWORD/g, '')), 'must not print passwords');
});
