/**
 * Migrates KYC document numbers to/from encrypted-at-rest form.
 *
 *   node scripts/encrypt-kyc.js              # DRY RUN (default): reports what would change
 *   node scripts/encrypt-kyc.js --apply      # encrypt plaintext rows (idempotent)
 *   node scripts/encrypt-kyc.js --rollback --apply   # decrypt back to plaintext
 *
 * Requires KYC_ENCRYPTION_KEY. TAKE A BACKUP FIRST. Works on the raw collection so it
 * never depends on model hooks, and each row is verified by a decrypt round-trip
 * before it is written.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fieldCrypto = require('../src/utils/fieldCrypto');

const apply = process.argv.includes('--apply');
const rollback = process.argv.includes('--rollback');

(async () => {
  if (!fieldCrypto.isEnabled()) {
    console.error('KYC_ENCRYPTION_KEY is not set (or invalid). Refusing to run.');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) { console.error('MONGO_URI is not set.'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.collection('kycrequests');
  const stats = { scanned: 0, changed: 0, skipped: 0, failed: 0 };

  for await (const doc of col.find({}, { projection: { documentNumber: 1 } })) {
    stats.scanned += 1;
    const stored = doc.documentNumber;
    try {
      if (rollback) {
        if (!fieldCrypto.isEncrypted(stored)) { stats.skipped += 1; continue; }
        const plain = fieldCrypto.decrypt(stored);
        if (apply) await col.updateOne({ _id: doc._id }, { $set: { documentNumber: plain } });
        stats.changed += 1;
      } else {
        if (!stored || fieldCrypto.isEncrypted(stored)) { stats.skipped += 1; continue; }
        const enc = fieldCrypto.encrypt(stored);
        if (fieldCrypto.decrypt(enc) !== stored) throw new Error('round-trip mismatch');
        if (apply) {
          await col.updateOne({ _id: doc._id }, { $set: {
            documentNumber: enc,
            documentNumberIndex: fieldCrypto.blindIndex(stored),
            documentNumberLast4: fieldCrypto.last4(stored)
          } });
        }
        stats.changed += 1;
      }
    } catch (err) {
      stats.failed += 1;
      console.error(`row ${doc._id}: ${err.message}`); // never print the value
    }
  }

  console.log(`${apply ? 'APPLIED' : 'DRY RUN'} (${rollback ? 'rollback' : 'encrypt'}):`, stats);
  if (!apply) console.log('No data was modified. Re-run with --apply after taking a backup.');
  await mongoose.disconnect();
  process.exit(stats.failed ? 2 : 0);
})().catch((err) => { console.error(err.message); process.exit(1); });
