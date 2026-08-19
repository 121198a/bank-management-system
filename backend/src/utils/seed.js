/**
 * Creates or resets the initial administrator from environment variables.
 * Required: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD.
 * No credentials are stored in source control.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');
const env = require('../config/env');

const seed = async () => {
  if (!env.adminSeed.email || !env.adminSeed.password) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set before running the seed command');
  }
  if (env.adminSeed.password.length < 12) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters long');
  }

  await connectDB();
  const email = env.adminSeed.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(env.adminSeed.password, 12);
  let user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');

  if (user) {
    user.fullName = env.adminSeed.fullName;
    user.passwordHash = passwordHash;
    user.role = 'admin';
    user.kycStatus = 'verified';
    user.isActive = true;
    user.refreshTokenHash = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.tokenVersion += 1;
    await user.save();
    console.log('Existing administrator reset successfully.');
  } else {
    user = await User.create({
      fullName: env.adminSeed.fullName,
      email,
      passwordHash,
      role: 'admin',
      kycStatus: 'verified',
      isActive: true
    });
    console.log('Administrator account created successfully.');
  }

  const verify = await User.findById(user._id).select('+passwordHash');
  const matches = await bcrypt.compare(env.adminSeed.password, verify.passwordHash);
  if (!matches) throw new Error('Seed verification failed: password hash mismatch');

  console.log('Administrator password hash verification: OK');
  await mongoose.disconnect();
};

seed().catch(async (err) => {
  console.error(`Seed failed: ${err.message}`);
  try { await mongoose.disconnect(); } catch (_) { /* noop */ }
  process.exit(1);
});
