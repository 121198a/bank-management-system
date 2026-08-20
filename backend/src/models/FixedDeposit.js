const mongoose = require('mongoose');

const fixedDepositSchema = new mongoose.Schema(
  {
    fdNumber: { type: String, required: true, unique: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, immutable: true },
    principal: { type: mongoose.Schema.Types.Decimal128, required: true, immutable: true },
    tenureMonths: { type: Number, required: true, min: 1, max: 120, immutable: true },
    interestRate: { type: Number, required: true, immutable: true },
    interestPayout: { type: String, enum: ['on_maturity', 'monthly', 'quarterly'], default: 'on_maturity' },
    
    maturityAmount: { type: mongoose.Schema.Types.Decimal128, required: true, immutable: true },
    startDate: { type: Date, required: true, immutable: true },
    maturityDate: { type: Date, required: true, immutable: true },
    nominee: { type: String, trim: true, default: '' },
    autoRenewal: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'matured', 'premature_closed', 'cancelled'], default: 'active' },
    closedAt: { type: Date, default: null },
    closureReason: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

fixedDepositSchema.index({ customer: 1 });
fixedDepositSchema.index({ status: 1, maturityDate: 1 });

module.exports = mongoose.model('FixedDeposit', fixedDepositSchema);
