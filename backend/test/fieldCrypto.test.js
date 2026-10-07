require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fc = require('../src/utils/fieldCrypto');

const KEY = crypto.randomBytes(32).toString('hex');
const OTHER = crypto.randomBytes(32).toString('hex');

test('round-trips and never stores the plaintext', () => {
  const stored = fc.encrypt('ABCDE1234F', KEY);
  assert.ok(fc.isEncrypted(stored));
  assert.ok(!stored.includes('ABCDE1234F'));
  assert.equal(fc.decrypt(stored, KEY), 'ABCDE1234F');
});

test('same input encrypts differently each time (random IV)', () => {
  assert.notEqual(fc.encrypt('123412341234', KEY), fc.encrypt('123412341234', KEY));
});

test('tampered ciphertext and wrong key are rejected (authenticated encryption)', () => {
  const stored = fc.encrypt('SECRET-ID-1', KEY);
  const parts = stored.split(':');
  parts[4] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => fc.decrypt(parts.join(':'), KEY));
  assert.throws(() => fc.decrypt(stored, OTHER));
});

test('legacy plaintext passes through unchanged; encrypt is idempotent', () => {
  assert.equal(fc.decrypt('PLAIN123', KEY), 'PLAIN123');
  const once = fc.encrypt('X1', KEY);
  assert.equal(fc.encrypt(once, KEY), once);
});

test('without a key, values are stored as before (opt-in rollout) and encrypted data fails closed', () => {
  assert.equal(fc.encrypt('PLAIN', ''), 'PLAIN');
  assert.equal(fc.isEnabled(''), false);
  assert.throws(() => fc.decrypt(fc.encrypt('Z', KEY), ''), /not configured/);
});

test('invalid key lengths are rejected', () => {
  assert.throws(() => fc.isEnabled('too-short'), /32 bytes/);
});

test('blind index is stable across formatting, key-dependent, and reveals no plaintext', () => {
  const a = fc.blindIndex('abcde-1234 f', KEY);
  assert.equal(a, fc.blindIndex('ABCDE1234F', KEY));
  assert.notEqual(a, fc.blindIndex('ABCDE1234F', OTHER));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(fc.last4('abcde-1234 f'), '234F');
});
