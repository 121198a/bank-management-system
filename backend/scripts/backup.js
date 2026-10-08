/**
 *   node scripts/backup.js [--out=backups/bank-<timestamp>.bkp]
 * Needs MONGO_URI and BACKUP_ENCRYPTION_KEY. Prints counts only - never document contents.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { writeBackup, dumpDatabase } = require('./lib/backup');

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.resolve(arg('out') || `backups/bank-${stamp}.bkp`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  await mongoose.connect(process.env.MONGO_URI);
  const manifest = await writeBackup(dumpDatabase(mongoose.connection.db), out, process.env.BACKUP_ENCRYPTION_KEY);
  fs.writeFileSync(`${out}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  console.log(`Backup written: ${out}`);
  console.log(`Documents: ${manifest.total}`, manifest.counts);
  console.log('Next: copy it OFF this machine, store the key separately, and rehearse a restore.');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error(`Backup failed: ${err.message}`); process.exit(1); });
