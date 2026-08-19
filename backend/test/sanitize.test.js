const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex, sanitizeForAudit } = require('../src/utils/sanitize');

test('regex input is escaped', () => {
  const escaped = escapeRegex('a+b?c');
  assert.equal(new RegExp(escaped).test('a+b?c'), true);
  assert.equal(new RegExp(escaped).test('aaabbbccc'), false);
});

test('audit sanitizer redacts credentials and KYC identifiers', () => {
  const result = sanitizeForAudit({ password: 'secret', refreshTokenHash: 'hash', documentNumber: '123', nested: { otp: '999999' }, safe: 'ok' });
  assert.equal(result.password, '[REDACTED]');
  assert.equal(result.refreshTokenHash, '[REDACTED]');
  assert.equal(result.documentNumber, '[REDACTED]');
  assert.equal(result.nested.otp, '[REDACTED]');
  assert.equal(result.safe, 'ok');
});
