/**
 *   node scripts/restore.js <file.bkp>                          # verify only (default) - writes nothing
 *   node scripts/restore.js <file.bkp> --apply --confirm=<db>   # restore into an EMPTY database
 * After a restore run `npm run indexes`.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { restoreDatabase } = require('./lib/backup');

const file = process.argv[2];
const apply = process.argv.includes('--apply');
const confirm = (process.argv.find((a) => a.startsWith('--confirm=')) || '').split('=')[1] || '';

(async () => {
  if (!file || file.startsWith('--')) throw new Error('Usage: node scripts/restore.js <file.bkp> [--apply --confirm=<db>]');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  await mongoose.connect(process.env.MONGO_URI);
  const dbName = mongoose.connection.name;
  const res = await restoreDatabase(mongoose.connection.db, file, process.env.BACKUP_ENCRYPTION_KEY, { apply, confirm, dbName });
  console.log(res.applied ? `RESTORED into "${dbName}":` : 'VERIFIED OK (nothing written). Contents:', res.counts);
  if (res.applied) console.log('Now run: npm run indexes');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error(`Restore failed: ${err.message}`); process.exit(1); });
