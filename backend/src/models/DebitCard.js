const mongoose = require('mongoose');

const debitCardSchema = new mongoose.Schema(
  {
    // e.g. DC-2026-000001
    applicationId: { type: String, required: true, unique: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, immutable: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    cardType: { type: String, enum: ['classic', 'platinum', 'premium'], required: true },
    nameOnCard: { type: String, required: true, trim: true, maxlength: 26 },
    deliveryAddress: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['requested', 'under_review', 'approved', 'issued', 'dispatched', 'delivered', 'rejected', 'blocked', 'expired', 'cancelled'],
      default: 'requested'
    },
    // Display-only fields. Never store CVV, PIN, or the full PAN.
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

debitCardSchema.virtual('maskedNumber').get(function maskedNumber() {
  return this.lastFourDigits ? `XXXX XXXX XXXX ${this.lastFourDigits}` : null;
});
debitCardSchema.set('toJSON', { virtuals: true });

debitCardSchema.index({ customer: 1 });
debitCardSchema.index({ status: 1 });
debitCardSchema.index({ account: 1 });

module.exports = mongoose.model('DebitCard', debitCardSchema);
