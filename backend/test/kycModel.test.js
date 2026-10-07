require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');

process.env.KYC_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const KYCRequest = require('../src/models/KYCRequest');
const fc = require('../src/utils/fieldCrypto');

const build = (num) => new KYCRequest({ user: new mongoose.Types.ObjectId(), documentType: 'pan', documentNumber: num });

test('document number is encrypted in the stored document but readable via the model', async () => {
  const doc = build('  ABCDE1234F ');
  await doc.validate();
  const raw = doc.toObject({ getters: false });
  assert.ok(fc.isEncrypted(raw.documentNumber), 'stored value must be ciphertext');
  assert.ok(!JSON.stringify(raw).includes('ABCDE1234F'), 'plaintext must not appear anywhere in the stored form');
  assert.equal(doc.documentNumber, 'ABCDE1234F');
  assert.equal(doc.toJSON().documentNumber, 'ABCDE1234F');
});

test('blind index and last-4 are derived, and the index never leaks via default queries', async () => {
  const doc = build('abcde 1234 f');
  await doc.validate();
  assert.equal(doc.documentNumberIndex, fc.blindIndex('ABCDE1234F'));
  assert.equal(doc.documentNumberLast4, '234F');
  assert.equal(KYCRequest.schema.path('documentNumberIndex').options.select, false);
});

test('required validation still rejects a missing document number', async () => {
  const doc = new KYCRequest({ user: new mongoose.Types.ObjectId(), documentType: 'pan' });
  await assert.rejects(() => doc.validate(), /documentNumber/);
});
