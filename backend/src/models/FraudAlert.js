const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true, immutable: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'under_review', 'confirmed', 'false_positive', 'resolved'], default: 'open' },
    
    reason: { type: String, required: true, trim: true },
    rule: { type: String, enum: ['rapid_transactions', 'unusual_amount', 'repeated_failed_logins', 'multiple_locations', 'manual'], required: true },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    relatedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolution: { type: String, trim: true, default: '' },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

fraudAlertSchema.index({ status: 1, severity: 1 });
fraudAlertSchema.index({ relatedUser: 1 });
fraudAlertSchema.index({ relatedAccount: 1 });

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);
