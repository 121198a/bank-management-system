const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema(
  {
    // e.g. CC-2026-000001
    applicationId: { type: String, required: true, unique: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, immutable: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    cardVariant: { type: String, enum: ['classic', 'platinum', 'premium'], required: true },
    monthlyIncome: { type: mongoose.Schema.Types.Decimal128, required: true },
    employmentType: { type: String, enum: ['salaried', 'self_employed', 'business_owner', 'other'], required: true },
    address: { type: String, required: true, trim: true },
    // References the customer's verified KYC record — the app must not
    // trust a client-supplied PAN/KYC value as fact without server lookup.
    kycReference: { type: mongoose.Schema.Types.ObjectId, ref: 'KYCRequest', default: null },
    requestedLimit: { type: mongoose.Schema.Types.Decimal128, required: true },
    approvedLimit: { type: mongoose.Schema.Types.Decimal128, default: null },
    deliveryAddress: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'issued', 'dispatched', 'delivered', 'blocked', 'cancelled'],
      default: 'submitted'
    },
    lastFourDigits: { type: String, match: [/^\d{4}$/, 'Must be exactly 4 digits'], default: null },
    expiryMonth: { type: Number, min: 1, max: 12, default: null },
    expiryYear: { type: Number, default: null },
    blockedAt: { type: Date, default: null },
    blockedReason: { type: String, trim: true, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    remarks: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

creditCardSchema.virtual('maskedNumber').get(function maskedNumber() {
  return this.lastFourDigits ? `XXXX XXXX XXXX ${this.lastFourDigits}` : null;
});
creditCardSchema.set('toJSON', { virtuals: true });

creditCardSchema.index({ customer: 1 });
creditCardSchema.index({ status: 1 });

module.exports = mongoose.model('CreditCard', creditCardSchema);
