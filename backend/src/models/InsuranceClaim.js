const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const insuranceClaimSchema = new mongoose.Schema(
  {
    // e.g. CLM-2026-000001
    claimNumber: { type: String, required: true, unique: true, immutable: true },
    policy: { type: mongoose.Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

    incidentDate: { type: Date, required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    claimAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    approvedAmount: { type: mongoose.Schema.Types.Decimal128, default: null },

    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    status: {
      type: String,
      enum: ['submitted', 'under_review', 'manager_review', 'approved', 'rejected', 'settled', 'cancelled'],
      default: 'submitted'
    },
    remarks: { type: [remarkSchema], default: [] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    managerReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    settledAt: { type: Date, default: null }
  },
  { timestamps: true }
);

insuranceClaimSchema.index({ customer: 1, createdAt: -1 });
insuranceClaimSchema.index({ policy: 1 });
insuranceClaimSchema.index({ status: 1 });
insuranceClaimSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
