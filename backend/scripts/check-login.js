/**
 * READ-ONLY login diagnostic. Never writes to the database and never prints passwords or hashes.
 *
 *   node scripts/check-login.js --list                 # who exists in this database (email, role, active)
 *   node scripts/check-login.js user@example.com       # does this user exist / is it active
 *   $env:CHECK_PASSWORD='...'; node scripts/check-login.js user@example.com   # also test the password (PowerShell)
 *
 * Needs MONGO_URI (read from backend/.env).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { diagnose } = require('./lib/loginDiagnosis');

const arg = process.argv[2];

const where = (uri) => {
  try {
    const host = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).hostname;
    return /^(localhost|127\.0\.0\.1|::1|mongo)$/.test(host) ? 'local' : 'remote (e.g. Atlas)';
  } catch { return 'unknown'; }
};

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set (backend/.env)');
  if (!arg) throw new Error('Usage: node scripts/check-login.js --list | <email>');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`Database: ${mongoose.connection.name}  [${where(process.env.MONGO_URI)}]`);

  const byRole = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]);
  const total = byRole.reduce((a, r) => a + r.n, 0);
  console.log(`Users in this database: ${total}  (${byRole.map((r) => `${r._id}: ${r.n}`).join(', ') || 'none'})`);
  if (total === 0) console.log('-> This database has NO users. You are probably connected to a different/new database than the one you created accounts in.');

  if (arg === '--list') {
    const users = await User.find({}, 'email role isActive').sort({ role: 1, email: 1 }).limit(200).lean();
    for (const u of users) console.log(`  ${u.role.padEnd(9)} ${u.isActive ? 'active  ' : 'INACTIVE'} ${u.email}`);
  } else {
    const email = arg.trim().toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    const password = process.env.CHECK_PASSWORD;
    const passwordMatches = user && user.isActive && password ? await user.comparePassword(password) : false;
    const d = diagnose({ user, passwordProvided: Boolean(password), passwordMatches });
    console.log(`\nEmail: ${email}`);
    if (user) console.log(`Found: role=${user.role}, active=${user.isActive}`);
    console.log(`Result: ${d.code}\n${d.summary}`);
    d.next.forEach((n) => console.log(`  - ${n}`));
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error(`check-login failed: ${err.message}`); process.exit(1); });
