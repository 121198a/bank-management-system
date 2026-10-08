/**
 * End-to-end flow against a REAL MongoDB replica set (transactions are required).
 * Skipped automatically unless E2E_MONGO_URI is set, so plain `npm test` stays fast.
 *
 *   E2E_MONGO_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npm run test:e2e
 *
 * Uses a throw-away database that is dropped at the end. Never point this at production data.
 */
require('../../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const URI = process.env.E2E_MONGO_URI;
const run = URI ? test : test.skip;
const skipReason = URI ? undefined : 'set E2E_MONGO_URI to run end-to-end tests';
if (!URI) test.skip(`bank end-to-end flow (${skipReason})`, () => {});

const PASSWORD = 'Str0ng!Passw0rd#1';
const uniq = crypto.randomBytes(4).toString('hex');
const idemKey = () => `e2e-${crypto.randomBytes(12).toString('hex')}`; // 16-128 chars

const ctx = {};

const api = async (method, path, { token, body, cookie, headers = {} } = {}) => {
  const res = await fetch(`${ctx.base}/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return { status: res.status, json, setCookie };
};

const refreshCookieFrom = (setCookie) => {
  const raw = setCookie.find((c) => c.startsWith('refreshToken='));
  return raw ? raw.split(';')[0] : null;
};

const balanceOf = async (token, accountId) => {
  const r = await api('GET', '/accounts/my', { token });
  const acc = r.json.data.accounts.find((a) => String(a._id || a.id) === String(accountId));
  return Number(acc.balance);
};

if (URI) {
  test.before(async () => {
    process.env.MONGO_URI = URI;
    const mongoose = require('mongoose');
    const dbName = `bank_e2e_${uniq}`;
    await mongoose.connect(URI, { dbName });
    ctx.mongoose = mongoose;
    // Build unique/partial indexes before use (idempotency keys, emails, one pending KYC per user).
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

    const app = require('../../src/app');
    await new Promise((r) => { ctx.server = app.listen(0, '127.0.0.1', r); });
    ctx.base = `http://127.0.0.1:${ctx.server.address().port}`;

    // The first admin cannot self-register (by design) - seed it directly.
    const bcrypt = require('bcryptjs');
    const User = require('../../src/models/User');
    ctx.adminEmail = `admin-${uniq}@example.com`;
    await User.create({ fullName: 'E2E Admin', email: ctx.adminEmail, passwordHash: await bcrypt.hash(PASSWORD, 4), role: 'admin' });
  });

  test.after(async () => {
    if (ctx.server) await new Promise((r) => ctx.server.close(r));
    if (ctx.mongoose) {
      await ctx.mongoose.connection.dropDatabase();
      await ctx.mongoose.disconnect();
    }
  });
}

run('registration validates input, hides secrets and rejects duplicates', { skip: skipReason }, async () => {
  const weak = await api('POST', '/auth/register', { body: { fullName: 'Weak Pw', email: `weak-${uniq}@example.com`, password: 'short' } });
  assert.equal(weak.status, 400);

  for (const who of ['alice', 'bob']) {
    const r = await api('POST', '/auth/register', { body: { fullName: `E2E ${who}`, email: `${who}-${uniq}@example.com`, password: PASSWORD } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.ok(!JSON.stringify(r.json).toLowerCase().includes('password'), 'response must not contain password fields');
    assert.equal(r.json.data.user.role, 'customer', 'public registration can only create customers');
  }

  const dup = await api('POST', '/auth/register', { body: { fullName: 'Dup', email: `alice-${uniq}@example.com`, password: PASSWORD } });
  assert.equal(dup.status, 409);
});

run('login: wrong password is rejected generically; success sets an HTTP-only refresh cookie', { skip: skipReason }, async () => {
  const bad = await api('POST', '/auth/login', { body: { email: `alice-${uniq}@example.com`, password: 'Wrong!Passw0rd#9' } });
  assert.equal(bad.status, 401);

  const logins = {};
  for (const [name, email] of [['admin', ctx.adminEmail], ['alice', `alice-${uniq}@example.com`], ['bob', `bob-${uniq}@example.com`]]) {
    const r = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
    assert.equal(r.status, 200, `${name}: ${JSON.stringify(r.json)}`);
    assert.ok(r.json.data.accessToken);
    logins[name] = r;
  }
  const cookieHeader = logins.alice.setCookie.find((c) => c.startsWith('refreshToken='));
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /SameSite=Strict/i);
  Object.assign(ctx, {
    adminToken: logins.admin.json.data.accessToken,
    aliceToken: logins.alice.json.data.accessToken,
    bobToken: logins.bob.json.data.accessToken,
    aliceCookie: refreshCookieFrom(logins.alice.setCookie)
  });
});

run('authorization: a customer cannot reach admin APIs; anonymous callers get 401', { skip: skipReason }, async () => {
  assert.equal((await api('GET', '/users', { token: ctx.aliceToken })).status, 403);
  assert.equal((await api('GET', '/users')).status, 401);
  assert.equal((await api('GET', '/users', { token: ctx.adminToken })).status, 200);
});

run('accounts: apply -> cannot transact while pending -> admin approves -> active with opening balance', { skip: skipReason }, async () => {
  const a = await api('POST', '/accounts', { token: ctx.aliceToken, body: { accountType: 'savings', initialDeposit: '1000.00' } });
  const b = await api('POST', '/accounts', { token: ctx.bobToken, body: { accountType: 'savings', initialDeposit: '200.00' } });
  assert.equal(a.status, 201, JSON.stringify(a.json));
  assert.equal(b.status, 201, JSON.stringify(b.json));
  ctx.aliceAcc = a.json.data.account;
  ctx.bobAcc = b.json.data.account;
  ctx.aliceId = ctx.aliceAcc._id || ctx.aliceAcc.id;
  ctx.bobId = ctx.bobAcc._id || ctx.bobAcc.id;

  const early = await api('POST', '/transactions/deposit', { token: ctx.aliceToken, headers: { 'Idempotency-Key': idemKey() }, body: { accountId: ctx.aliceId, amount: '10.00' } });
  assert.equal(early.status, 400, 'pending accounts must not accept money');

  // A customer must not be able to approve their own account.
  assert.equal((await api('PUT', `/accounts/${ctx.aliceId}/approve`, { token: ctx.aliceToken })).status, 403);

  for (const id of [ctx.aliceId, ctx.bobId]) {
    const ok = await api('PUT', `/accounts/${id}/approve`, { token: ctx.adminToken });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
  }
  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 1000);
  assert.equal(await balanceOf(ctx.bobToken, ctx.bobId), 200);
});

run('deposit: requires an Idempotency-Key and is exactly-once on replay', { skip: skipReason }, async () => {
  const body = { accountId: ctx.aliceId, amount: '250.50' };

  const noKey = await api('POST', '/transactions/deposit', { token: ctx.aliceToken, body });
  assert.equal(noKey.status, 400);

  const key = idemKey();
  const first = await api('POST', '/transactions/deposit', { token: ctx.aliceToken, headers: { 'Idempotency-Key': key }, body });
  assert.equal(first.status, 201, JSON.stringify(first.json));
  assert.equal(Number(first.json.data.balance), 1250.5);

  const replay = await api('POST', '/transactions/deposit', { token: ctx.aliceToken, headers: { 'Idempotency-Key': key }, body });
  assert.ok([200, 201].includes(replay.status));
  assert.equal(Number(replay.json.data.balance), 1250.5);
  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 1250.5, 'a replayed request must not credit twice');

  const reuse = await api('POST', '/transactions/deposit', { token: ctx.aliceToken, headers: { 'Idempotency-Key': key }, body: { ...body, amount: '999.00' } });
  assert.equal(reuse.status, 409, 'same key with a different payload must be refused');
  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 1250.5);
});

run('withdraw: cannot overdraw; invalid amounts are rejected; balance unchanged on failure', { skip: skipReason }, async () => {
  const over = await api('POST', '/transactions/withdraw', { token: ctx.aliceToken, headers: { 'Idempotency-Key': idemKey() }, body: { accountId: ctx.aliceId, amount: '999999.00' } });
  assert.equal(over.status, 400);
  for (const amount of ['0', '-5', '1.234', 'abc']) {
    const r = await api('POST', '/transactions/withdraw', { token: ctx.aliceToken, headers: { 'Idempotency-Key': idemKey() }, body: { accountId: ctx.aliceId, amount } });
    assert.equal(r.status, 400, `amount ${amount} should be rejected`);
  }
  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 1250.5);

  const ok = await api('POST', '/transactions/withdraw', { token: ctx.aliceToken, headers: { 'Idempotency-Key': idemKey() }, body: { accountId: ctx.aliceId, amount: '50.50' } });
  assert.equal(ok.status, 201, JSON.stringify(ok.json));
  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 1200);
});

run('transfer: moves money atomically, conserves the total, and enforces ownership', { skip: skipReason }, async () => {
  const before = (await balanceOf(ctx.aliceToken, ctx.aliceId)) + (await balanceOf(ctx.bobToken, ctx.bobId));

  const t = await api('POST', '/transactions/transfer', {
    token: ctx.aliceToken, headers: { 'Idempotency-Key': idemKey() },
    body: { fromAccountId: ctx.aliceId, toAccountNumber: ctx.bobAcc.accountNumber, amount: '300.25', description: 'e2e transfer' }
  });
  assert.equal(t.status, 201, JSON.stringify(t.json));

  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 899.75);
  assert.equal(await balanceOf(ctx.bobToken, ctx.bobId), 500.25);
  const after = (await balanceOf(ctx.aliceToken, ctx.aliceId)) + (await balanceOf(ctx.bobToken, ctx.bobId));
  assert.equal(Math.round(after * 100), Math.round(before * 100), 'total money in the system must be conserved');

  // Bob must not be able to spend from Alice's account.
  const steal = await api('POST', '/transactions/transfer', {
    token: ctx.bobToken, headers: { 'Idempotency-Key': idemKey() },
    body: { fromAccountId: ctx.aliceId, toAccountNumber: ctx.bobAcc.accountNumber, amount: '1.00' }
  });
  assert.equal(steal.status, 403);

  // Overdrawing transfer is refused and changes nothing.
  const big = await api('POST', '/transactions/transfer', {
    token: ctx.aliceToken, headers: { 'Idempotency-Key': idemKey() },
    body: { fromAccountId: ctx.aliceId, toAccountNumber: ctx.bobAcc.accountNumber, amount: '100000.00' }
  });
  assert.equal(big.status, 400);
  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 899.75);
  assert.equal(await balanceOf(ctx.bobToken, ctx.bobId), 500.25);

  // Concurrent identical transfers with ONE key must debit once.
  const key = idemKey();
  const payload = { fromAccountId: ctx.aliceId, toAccountNumber: ctx.bobAcc.accountNumber, amount: '10.00' };
  const results = await Promise.all([1, 2, 3].map(() => api('POST', '/transactions/transfer', { token: ctx.aliceToken, headers: { 'Idempotency-Key': key }, body: payload })));
  assert.ok(results.some((r) => r.status === 201), 'one request must succeed');
  assert.equal(await balanceOf(ctx.aliceToken, ctx.aliceId), 889.75, 'concurrent duplicates must debit exactly once');
});

run('transaction history is scoped: owner sees it, other customers do not', { skip: skipReason }, async () => {
  const mine = await api('GET', `/transactions/account/${ctx.aliceId}`, { token: ctx.aliceToken });
  assert.equal(mine.status, 200);
  const types = JSON.stringify(mine.json);
  assert.match(types, /transfer_out/);
  const other = await api('GET', `/transactions/account/${ctx.aliceId}`, { token: ctx.bobToken });
  assert.ok([403, 404].includes(other.status), `expected 403/404, got ${other.status}`);
});

run('sessions: refresh rotates the token, reuse is detected, logout ends the session', { skip: skipReason }, async () => {
  const first = await api('POST', '/auth/refresh', { cookie: ctx.aliceCookie });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.ok(first.json.data.accessToken);
  const rotated = refreshCookieFrom(first.setCookie);
  assert.ok(rotated && rotated !== ctx.aliceCookie, 'refresh token must rotate');

  const reuse = await api('POST', '/auth/refresh', { cookie: ctx.aliceCookie });
  assert.equal(reuse.status, 401, 'reusing an old refresh token must fail');

  // Reuse invalidates the whole session, so even the newest cookie is dead.
  const afterReuse = await api('POST', '/auth/refresh', { cookie: rotated });
  assert.equal(afterReuse.status, 401);

  const relog = await api('POST', '/auth/login', { body: { email: `bob-${uniq}@example.com`, password: PASSWORD } });
  const bobCookie = refreshCookieFrom(relog.setCookie);
  const out = await api('POST', '/auth/logout', { cookie: bobCookie, token: relog.json.data.accessToken });
  assert.equal(out.status, 200);
  assert.equal((await api('POST', '/auth/refresh', { cookie: bobCookie })).status, 401);
});
