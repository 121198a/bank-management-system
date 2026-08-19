const mongoose = require('mongoose');
const crypto = require('crypto');
const { decimalToString } = require('../utils/money');

const transactionSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, immutable: true, default: () => `TXN-${crypto.randomUUID().replace(/-/g, '').toUpperCase()}` },
    operationId: { type: String, required: true, immutable: true },
    idempotencyKey: { type: String, immutable: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, immutable: true },
    relatedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null, immutable: true },
    type: { type: String, enum: ['deposit', 'withdraw', 'transfer_in', 'transfer_out'], required: true, immutable: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true, immutable: true },
    balanceAfter: { type: mongoose.Schema.Types.Decimal128, required: true, immutable: true },
    currency: { type: String, enum: ['INR'], required: true, immutable: true },
    description: { type: String, trim: true, default: '', immutable: true, maxlength: 250 },
    status: { type: String, enum: ['pending', 'success', 'failed', 'reversed'], default: 'success' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true }
  },
  { timestamps: true }
);

transactionSchema.index({ account: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1, createdAt: -1 });
transactionSchema.index({ operationId: 1 });
transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
transactionSchema.index({ createdAt: -1 });

transactionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.amount = decimalToString(ret.amount);
    ret.balanceAfter = decimalToString(ret.balanceAfter);
    return ret;
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
