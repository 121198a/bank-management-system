const mongoose = require('mongoose');
const { decimalToString } = require('../utils/money');

const nomineeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    relation: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const accountLimitsSchema = new mongoose.Schema(
  {
    dailyTransferLimit: { type: mongoose.Schema.Types.Decimal128, default: '100000.00' },
    dailyWithdrawalLimit: { type: mongoose.Schema.Types.Decimal128, default: '50000.00' }
  },
  { _id: false }
);

const accountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, required: true, unique: true, trim: true, immutable: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    accountType: {
      type: String,
      enum: ['savings', 'current', 'salary', 'student', 'senior_citizen'],
      default: 'savings',
      immutable: true
    },
    balance: { type: mongoose.Schema.Types.Decimal128, required: true, default: '0.00', min: 0 },
    // Funds earmarked (e.g. by a pending card/loan lien) but not yet debited.
    // availableBalance = balance - holdAmount, exposed as a virtual so
    // balance always remains the single source of truth.
    holdAmount: { type: mongoose.Schema.Types.Decimal128, default: '0.00' },
    initialDeposit: { type: mongoose.Schema.Types.Decimal128, required: true, default: '0.00', immutable: true },
    currency: { type: String, enum: ['INR'], default: 'INR', immutable: true },
    status: { type: String, enum: ['pending', 'active', 'rejected', 'frozen', 'suspended', 'closed'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null},
    // Snapshotted at approval time — deliberately NOT a live lookup, so an
    // account's printed IFSC/branch stays correct even if the branch record
    // (e.g. IFSC prefix) changes later.
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    ifsc: { type: String, default: null },
    branchName: { type: String, default: null },
    nominee: { type: nomineeSchema, default: () => ({}) },
    // Architecture-ready for joint accounts; no joint-authorization logic
    // implemented yet, primary `user` remains sole authoritative owner.
    jointHolders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    limits: { type: accountLimitsSchema, default: () => ({}) },
    lastTransactionDate: { type: Date, default: null }
  },
  { timestamps: true }
);

accountSchema.virtual('availableBalance').get(function availableBalance() {
  const { decimalToMinor, minorToDecimal } = require('../utils/money');
  const held = decimalToMinor(this.holdAmount || '0.00');
  const bal = decimalToMinor(this.balance || '0.00');
  const remaining = bal - held > 0n ? bal - held : 0n;
  return decimalToString(minorToDecimal(remaining));
});
accountSchema.index({ user: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ accountNumber: 'text' });
accountSchema.index({ branch: 1 });

accountSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.balance = decimalToString(ret.balance);
    ret.initialDeposit = decimalToString(ret.initialDeposit);
    ret.holdAmount = decimalToString(ret.holdAmount);
    if (ret.limits) {
      ret.limits.dailyTransferLimit = decimalToString(ret.limits.dailyTransferLimit);
      ret.limits.dailyWithdrawalLimit = decimalToString(ret.limits.dailyWithdrawalLimit);
    }
    return ret;
  }
});

module.exports = mongoose.model('Account', accountSchema);
