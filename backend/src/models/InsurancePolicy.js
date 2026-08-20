const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const nomineeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    relation: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const insurancePolicySchema = new mongoose.Schema(
  {
    policyNumber: { type: String, required: true, unique: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true, immutable: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, immutable: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

    sumInsured: { type: mongoose.Schema.Types.Decimal128, required: true, immutable: true },
    annualPremium: { type: mongoose.Schema.Types.Decimal128, required: true, immutable: true },
    premiumFrequency: { type: String, enum: ['monthly', 'quarterly', 'annually'], default: 'annually' },
    termMonths: { type: Number, required: true, immutable: true },

    nominee: { type: nomineeSchema, default: () => ({}) },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    documentsRequested: { type: [String], default: [] },

    status: {
      type: String,
      enum: ['submitted', 'under_review', 'documents_required', 'manager_review', 'approved', 'rejected', 'active', 'lapsed', 'expired', 'cancelled'],
      default: 'submitted'
    },
    remarks: { type: [remarkSchema], default: [] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    managerReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    issuedAt: { type: Date, default: null },
    nextPremiumDueDate: { type: Date, default: null },
    lastPremiumPaidAt: { type: Date, default: null }
  },
  { timestamps: true }
);

insurancePolicySchema.index({ customer: 1, createdAt: -1 });
insurancePolicySchema.index({ status: 1 });
insurancePolicySchema.index({ branch: 1, status: 1 });
insurancePolicySchema.index({ department: 1, status: 1 });

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
