/**
 * One-time migration for databases created by the pre-production schema.
 * Run against a backup first. It converts historical numeric money fields to Decimal128
 * and adds immutable transaction metadata required by the hardened schema.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { toDecimal128 } = require('./money');

(async () => {
  try {
    await connectDB();

    const accounts = Account.find().cursor();
    let accountCount = 0;
    for await (const account of accounts) {
      const balance = toDecimal128(account.balance?.toString?.() || '0.00', { allowZero: true });
      const initialDeposit = account.status === 'pending'
        ? balance
        : toDecimal128(account.initialDeposit?.toString?.() || '0.00', { allowZero: true });
      await Account.collection.updateOne(
        { _id: account._id },
        { $set: { balance, initialDeposit, currency: account.currency || 'INR' } }
      );
      accountCount += 1;
    }

    const transactions = Transaction.find().cursor();
    let transactionCount = 0;
    for await (const transaction of transactions) {
      const amount = toDecimal128(transaction.amount?.toString?.() || '0.00');
      const balanceAfter = toDecimal128(transaction.balanceAfter?.toString?.() || '0.00', { allowZero: true });
      await Transaction.collection.updateOne(
        { _id: transaction._id },
        {
          $set: {
            amount,
            balanceAfter,
            currency: transaction.currency || 'INR',
            operationId: transaction.operationId || crypto.randomUUID(),
            reference: transaction.reference || `TXN-${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`
          }
        }
      );
      transactionCount += 1;
    }

    console.log(`Money migration complete. Accounts: ${accountCount}; transactions: ${transactionCount}.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(`Money migration failed: ${err.message}`);
    try { await mongoose.disconnect(); } catch (_) { /* noop */ }
    process.exit(1);
  }
})();
