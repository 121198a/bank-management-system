/**
 * Seed script — creates ONLY the single initial administrator account.
 *
 * This intentionally does NOT create employees, customers, accounts,
 * transactions, or notifications. All of that is created by the admin
 * through the application UI after logging in (User Management page).
 *
 * Run with: npm run seed
 *
 * Safe to re-run: if an admin with this email already exists, the script
 * updates its password/role/status to match this file rather than creating
 * a duplicate or crashing on a unique-index violation.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

// ─── Single source of truth for the initial admin account ──────────────────
const ADMIN_ACCOUNT = {
  fullName: 'Abhishek Kumar Sharma',
  email: 'admin@digitalbank.com',
  password: 'Admin@12715',
  phone: '9876543210',
  address: 'Connaught Place, New Delhi, India',
  role: 'admin',
  kycStatus: 'verified',
  isActive: true,
  avatarColor: '#16a34a'
};
// ─────────────────────────────────────────────────────────────────────────

const seed = async () => {
  await connectDB();

  const email = ADMIN_ACCOUNT.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_ACCOUNT.password, 12);

  const existing = await User.findOne({ email });

  if (existing) {
    existing.fullName = ADMIN_ACCOUNT.fullName;
    existing.passwordHash = passwordHash;
    existing.phone = ADMIN_ACCOUNT.phone;
    existing.address = ADMIN_ACCOUNT.address;
    existing.role = 'admin';
    existing.kycStatus = 'verified';
    existing.isActive = true;
    existing.refreshTokenHash = null;
    existing.resetPasswordToken = null;
    existing.resetPasswordExpires = null;
    await existing.save();
    console.log('\nExisting admin account found — credentials and details have been reset to match seed.js.\n');
  } else {
    await User.create({
      fullName: ADMIN_ACCOUNT.fullName,
      email,
      passwordHash,
      phone: ADMIN_ACCOUNT.phone,
      address: ADMIN_ACCOUNT.address,
      role: 'admin',
      kycStatus: 'verified',
      isActive: true,
      avatarColor: ADMIN_ACCOUNT.avatarColor
    });
    console.log('\nAdmin account created successfully.\n');
  }

  // Sanity-check: immediately re-fetch with password and verify bcrypt.compare
  // works end-to-end, so a seeding bug is caught right here instead of surfacing
  // later as a confusing "login failed" in the browser.
  const verify = await User.findOne({ email }).select('+passwordHash');
  const matches = await bcrypt.compare(ADMIN_ACCOUNT.password, verify.passwordHash);

  if (!matches) {
    console.error('SEED VERIFICATION FAILED: password hash does not match after save.');
    console.error('This indicates a bug in the User model or bcrypt setup — please report this.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('--- Administrator Login Credentials ---');
  console.log(`Name:     ${ADMIN_ACCOUNT.fullName}`);
  console.log(`Email:    ${ADMIN_ACCOUNT.email}`);
  console.log(`Password: ${ADMIN_ACCOUNT.password}`);
  console.log('----------------------------------------');
  console.log('Password verified against database: OK\n');
  console.log('Log in with these credentials, then use User Management to create');
  console.log('employee and customer accounts from the admin dashboard.\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
