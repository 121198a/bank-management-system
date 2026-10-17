require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { BSON } = require('mongoose').mongo;
const { ObjectId, Decimal128, Binary } = BSON;
const { writeBackup, readBackup, verifyBackup, dumpDatabase, restoreDatabase } = require('../scripts/lib/backup');

const KEY = crypto.randomBytes(32).toString('hex');
const OTHER_KEY = crypto.randomBytes(32).toString('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bkp-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const SECRET_MARKER = 'SENSITIVE-PAN-ABCDE1234F';
const sampleDocs = () => ([
  { collection: 'users', doc: { _id: new ObjectId(), email: 'a@example.com', passwordHash: '$2a$12$abc', createdAt: new Date('2026-01-02T03:04:05Z'), n: 7, nested: { arr: [1, 'x', null] } } },
  { collection: 'accounts', doc: { _id: new ObjectId(), balance: Decimal128.fromString('1234.50'), owner: SECRET_MARKER, blob: new Binary(Buffer.from([1, 2, 3])) } },
  { collection: 'accounts', doc: { _id: new ObjectId(), balance: Decimal128.fromString('0.01') } }
]);
async function* iter(arr) { for (const x of arr) yield x; }
const collect = async (gen) => { const out = []; for await (const x of gen) out.push(x); return out; };
const file = (name) => path.join(tmp, name);

test('round-trips documents with ObjectId, Decimal128, Date and Binary preserved', async () => {
  const docs = sampleDocs();
  const f = file('rt.bkp');
  const manifest = await writeBackup(iter(docs), f, KEY);
  assert.deepEqual(manifest.counts, { users: 1, accounts: 2 });
  const back = await collect(readBackup(f, KEY));
  assert.equal(back.length, 3);
  assert.ok(back[0].doc._id instanceof ObjectId);
  assert.equal(back[0].doc._id.toHexString(), docs[0].doc._id.toHexString());
  assert.ok(back[0].doc.createdAt instanceof Date);
  assert.equal(back[0].doc.createdAt.toISOString(), '2026-01-02T03:04:05.000Z');
  assert.ok(back[1].doc.balance instanceof Decimal128);
  assert.equal(back[1].doc.balance.toString(), '1234.50');
  assert.deepEqual(Buffer.from(back[1].doc.blob.buffer), Buffer.from([1, 2, 3]));
  // Exact type fidelity (int32 vs double vs long etc.): canonical EJSON of original and restored must match.
  const canon = (d) => BSON.EJSON.stringify(d, { relaxed: false });
  docs.forEach((orig, i) => assert.equal(canon(back[i].doc), canon(orig.doc)));
});

test('the file on disk is encrypted: no plaintext PII and no gzip/JSON signature', async () => {
  const f = file('enc.bkp');
  await writeBackup(iter(sampleDocs()), f, KEY);
  const raw = fs.readFileSync(f);
  assert.ok(!raw.includes(SECRET_MARKER) && !raw.includes('a@example.com') && !raw.includes('passwordHash'));
  assert.equal(raw.subarray(0, 5).toString(), 'BKPv1');
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(f).mode & 0o077, 0, 'backup must not be group/world readable');
  }
});

test('manifest holds counts + checksum only, never document contents', async () => {
  const f = file('man.bkp');
  const manifest = await writeBackup(iter(sampleDocs()), f, KEY);
  assert.match(manifest.sha256, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(manifest).includes(SECRET_MARKER));
  const actual = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  assert.equal(manifest.sha256, actual);
});

test('wrong key is rejected (and never hangs)', { timeout: 15000 }, async () => {
  const f = file('wk.bkp');
  await writeBackup(iter(sampleDocs()), f, KEY);
  await assert.rejects(() => verifyBackup(f, OTHER_KEY), /corrupt, tampered with, or the key is wrong/);
});

test('a single flipped byte anywhere is detected', { timeout: 20000 }, async () => {
  const f = file('flip-src.bkp');
  await writeBackup(iter(sampleDocs()), f, KEY);
  const original = fs.readFileSync(f);
  for (const pos of [original.length >> 1, 30, original.length - 20, original.length - 1]) {
    const mutated = Buffer.from(original);
    mutated[pos] ^= 0x01;
    const mf = file(`flip-${pos}.bkp`);
    fs.writeFileSync(mf, mutated);
    await assert.rejects(() => verifyBackup(mf, KEY), /corrupt|tampered|not a BKPv1/, `flip at byte ${pos} must be detected`);
  }
});

test('truncated and non-backup files are rejected', { timeout: 15000 }, async () => {
  const f = file('trunc-src.bkp');
  await writeBackup(iter(sampleDocs()), f, KEY);
  const original = fs.readFileSync(f);
  fs.writeFileSync(file('trunc.bkp'), original.subarray(0, original.length - 40));
  await assert.rejects(() => verifyBackup(file('trunc.bkp'), KEY), /corrupt|tampered|truncated/);
  fs.writeFileSync(file('junk.bkp'), Buffer.alloc(200, 7));
  await assert.rejects(() => verifyBackup(file('junk.bkp'), KEY), /Not a BKPv1/);
  fs.writeFileSync(file('tiny.bkp'), 'x');
  await assert.rejects(() => verifyBackup(file('tiny.bkp'), KEY), /truncated|not a backup/);
});

test('missing or malformed key is rejected before touching any file', async () => {
  await assert.rejects(() => writeBackup(iter([]), file('nokey.bkp'), ''), /not set/);
  await assert.rejects(() => writeBackup(iter([]), file('badkey.bkp'), 'short'), /32 bytes/);
});

// ---- database glue, against an in-memory fake with the same call shapes the CLI uses ----
const fakeDb = (data = {}) => {
  const store = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, [...v]]));
  return {
    store,
    listCollections: () => ({ toArray: async () => Object.keys(store).map((name) => ({ name })).concat([{ name: 'system.views' }]) }),
    collection: (name) => ({
      find: () => ({ batchSize: () => (async function* () { for (const d of store[name] || []) yield d; })() }),
      countDocuments: async () => (store[name] || []).length,
      insertMany: async (docs) => { store[name] = (store[name] || []).concat(docs); }
    })
  };
};

test('dumpDatabase skips system.* collections and respects exclusions', async () => {
  const db = fakeDb({ users: [{ _id: 1 }], audit: [{ _id: 2 }] });
  const names = (await collect(dumpDatabase(db, { exclude: ['audit'] }))).map((r) => r.collection);
  assert.deepEqual(names, ['users']);
});

test('restore: verify-only by default writes nothing', async () => {
  const src = fakeDb({ users: [{ _id: new ObjectId(), e: 1 }], accounts: [{ _id: new ObjectId() }, { _id: new ObjectId() }] });
  const f = file('db1.bkp');
  await writeBackup(dumpDatabase(src), f, KEY);
  const target = fakeDb();
  const res = await restoreDatabase(target, f, KEY, {});
  assert.deepEqual(res, { counts: { accounts: 2, users: 1 }, applied: false });
  assert.deepEqual(target.store, {});
});

test('restore --apply needs the exact database name, and an empty target', async () => {
  const src = fakeDb({ users: [{ _id: new ObjectId() }] });
  const f = file('db2.bkp');
  await writeBackup(dumpDatabase(src), f, KEY);

  await assert.rejects(() => restoreDatabase(fakeDb(), f, KEY, { apply: true, dbName: 'prod', confirm: '' }), /--confirm=prod/);
  await assert.rejects(() => restoreDatabase(fakeDb(), f, KEY, { apply: true, dbName: 'prod', confirm: 'staging' }), /--confirm=prod/);
  await assert.rejects(() => restoreDatabase(fakeDb({ users: [{ _id: 1 }] }), f, KEY, { apply: true, dbName: 'prod', confirm: 'prod' }), /not empty/);

  const target = fakeDb();
  const res = await restoreDatabase(target, f, KEY, { apply: true, dbName: 'prod', confirm: 'prod' });
  assert.equal(res.applied, true);
  assert.equal(target.store.users.length, 1);
  assert.ok(target.store.users[0]._id instanceof ObjectId);
});

test('a tampered backup is rejected BEFORE anything is written (verify-then-apply)', { timeout: 20000 }, async () => {
  const docs = Array.from({ length: 50 }, () => ({ _id: new ObjectId(), v: 'x'.repeat(50) }));
  const src = fakeDb({ users: docs });
  const f = file('db3.bkp');
  await writeBackup(dumpDatabase(src), f, KEY);
  const buf = fs.readFileSync(f);
  buf[buf.length >> 1] ^= 0xff;
  fs.writeFileSync(f, buf);
  const target = fakeDb();
  await assert.rejects(() => restoreDatabase(target, f, KEY, { apply: true, dbName: 'prod', confirm: 'prod' }), /corrupt|tampered/);
  assert.deepEqual(target.store, {}, 'nothing may be written from a failed verification');
});

test('large restores are inserted in batches', async () => {
  const docs = Array.from({ length: 1203 }, () => ({ _id: new ObjectId() }));
  const f = file('db4.bkp');
  await writeBackup(dumpDatabase(fakeDb({ big: docs })), f, KEY);
  const calls = [];
  const target = fakeDb();
  const col = target.collection;
  target.collection = (n) => ({ ...col(n), insertMany: async (d) => { calls.push(d.length); await col(n).insertMany(d); } });
  await restoreDatabase(target, f, KEY, { apply: true, dbName: 'd', confirm: 'd', batchSize: 500 });
  assert.deepEqual(calls, [500, 500, 203]);
});
