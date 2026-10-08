/**
 * Encrypted logical backup / restore.
 *
 * File format (".bkp"): MAGIC(8) | IV(12) | AES-256-GCM(gzip(NDJSON)) | TAG(16)
 * NDJSON line:  {"c":"<collection>","d":<canonical EJSON document>}
 * Sidecar manifest (.manifest.json, contains NO personal data): counts per collection, sha256 of the .bkp.
 *
 * Safety properties
 *  - Encrypted at rest with BACKUP_ENCRYPTION_KEY (32 bytes, hex or base64); backups hold password hashes and PII.
 *  - GCM tag is verified over the WHOLE file before a restore writes anything (verify-then-apply).
 *  - Restore refuses a non-empty target and requires an explicit database-name confirmation to proceed.
 *
 * LIMITS: this is a logical export, not a point-in-time snapshot. Writes that land while it runs may
 * or may not be included. For consistent production backups prefer `mongodump --oplog` or Atlas
 * snapshots, and use this for portability / offline copies.
 */
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const { once } = require('events');
const { pipeline } = require('stream/promises');
const { PassThrough } = require('stream');
const { BSON } = require('mongoose').mongo;

const MAGIC = Buffer.from('BKPv1\0\0\0');
const IV_LEN = 12;
const TAG_LEN = 16;
const EJSON_OPTS = { relaxed: false };

const parseKey = (raw) => {
  if (!raw) throw new Error('BACKUP_ENCRYPTION_KEY is not set');
  const v = String(raw).trim();
  const buf = /^[0-9a-fA-F]{64}$/.test(v) ? Buffer.from(v, 'hex') : Buffer.from(v, 'base64');
  if (buf.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64)');
  return Buffer.from(crypto.hkdfSync('sha256', buf, Buffer.alloc(0), 'backup-v1', 32));
};

/** Write an async iterable of {collection, doc} to an encrypted file. Returns the manifest. */
const writeBackup = async (records, outPath, rawKey) => {
  const key = parseKey(rawKey);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const gzip = zlib.createGzip();
  const out = fs.createWriteStream(outPath, { mode: 0o600 });
  const counts = {};

  const done = pipeline(gzip, cipher, async function* appendTag(source) {
    yield MAGIC;
    yield iv;
    for await (const chunk of source) yield chunk;
    yield cipher.getAuthTag();
  }, out);

  for await (const { collection, doc } of records) {
    counts[collection] = (counts[collection] || 0) + 1;
    const line = `${JSON.stringify({ c: collection, d: JSON.parse(BSON.EJSON.stringify(doc, EJSON_OPTS)) })}\n`;
    if (!gzip.write(line)) await once(gzip, 'drain');
  }
  gzip.end();
  await done;

  const sha256 = await new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(outPath).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
  return { format: 'BKPv1', createdAt: new Date().toISOString(), sha256, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
};

/** Async generator of {collection, doc}. Throws at the END if the authentication tag does not verify. */
async function* readBackup(inPath, rawKey) {
  const key = parseKey(rawKey);
  const { size } = await fs.promises.stat(inPath);
  if (size < MAGIC.length + IV_LEN + TAG_LEN) throw new Error('Backup file is truncated or not a backup');

  const fh = await fs.promises.open(inPath, 'r');
  let header; let tag;
  try {
    header = Buffer.alloc(MAGIC.length + IV_LEN);
    await fh.read(header, 0, header.length, 0);
    tag = Buffer.alloc(TAG_LEN);
    await fh.read(tag, 0, TAG_LEN, size - TAG_LEN);
  } finally { await fh.close(); }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a BKPv1 backup file');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
  decipher.setAuthTag(tag);
  const source = fs.createReadStream(inPath, { start: header.length, end: size - TAG_LEN - 1 });
  const lines = new PassThrough();
  lines.setEncoding('utf8'); // StringDecoder: safe across multi-byte chunk boundaries

  // pipeline() destroys every stage and re-throws the first error (bad tag, bad gzip, I/O) into
  // `lines`, so the consumer below always terminates instead of hanging on a half-closed pipe.
  pipeline(source, decipher, zlib.createGunzip(), lines).catch(() => { /* surfaced via `lines` */ });

  let buffered = '';
  try {
    for await (const chunk of lines) {
      buffered += chunk;
      let nl;
      while ((nl = buffered.indexOf('\n')) >= 0) {
        const line = buffered.slice(0, nl);
        buffered = buffered.slice(nl + 1);
        if (!line) continue;
        const { c, d } = JSON.parse(line);
        yield { collection: c, doc: BSON.EJSON.deserialize(d, EJSON_OPTS) };
      }
    }
    if (buffered.trim()) throw new Error('trailing partial record');
  } catch (err) {
    throw new Error(`Backup is corrupt, tampered with, or the key is wrong (${err.code || err.message})`);
  }
}

/** Full read of the file: authenticates every byte and returns per-collection counts. Writes nothing. */
const verifyBackup = async (inPath, rawKey) => {
  const counts = {};
  for await (const { collection } of readBackup(inPath, rawKey)) counts[collection] = (counts[collection] || 0) + 1;
  return counts;
};

async function* dumpDatabase(db, { exclude = [] } = {}) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    if (name.startsWith('system.') || exclude.includes(name)) continue;
    for await (const doc of db.collection(name).find({}).batchSize(1000)) yield { collection: name, doc };
  }
}

/**
 * Restore. Always verifies the whole file first. Returns { counts, applied }.
 * apply=true additionally requires: every target collection empty, and confirm === db name.
 */
const restoreDatabase = async (db, inPath, rawKey, { apply = false, confirm = '', dbName = '', batchSize = 500 } = {}) => {
  const counts = await verifyBackup(inPath, rawKey); // pass 1: authenticate everything, write nothing
  if (!apply) return { counts, applied: false };

  if (!dbName || confirm !== dbName) throw new Error(`Refusing to restore: pass --confirm=${dbName || '<database name>'} to proceed`);
  for (const name of Object.keys(counts)) {
    const existing = await db.collection(name).countDocuments({}, { limit: 1 });
    if (existing > 0) throw new Error(`Refusing to restore: collection "${name}" is not empty (restore only into an empty database)`);
  }

  let batch = []; let current = null;
  const flush = async () => { if (batch.length) { await db.collection(current).insertMany(batch, { ordered: true }); batch = []; } };
  for await (const { collection, doc } of readBackup(inPath, rawKey)) { // pass 2
    if (collection !== current) { await flush(); current = collection; }
    batch.push(doc);
    if (batch.length >= batchSize) await flush();
  }
  await flush();
  return { counts, applied: true };
};

module.exports = { writeBackup, readBackup, verifyBackup, dumpDatabase, restoreDatabase, parseKey };
