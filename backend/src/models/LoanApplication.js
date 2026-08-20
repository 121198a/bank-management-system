const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const loanApplicationSchema = new mongoose.Schema(
  {
    applicationId: { type: String, required: true, unique: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },

    employmentType: { type: String, enum: ['salaried', 'self_employed', 'business_owner', 'unemployed', 'other'], required: true },
    employerName: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    monthlyIncome: { type: mongoose.Schema.Types.Decimal128, required: true },
    workExperienceYears: { type: Number, min: 0, default: 0 },

    loanType: { type: String, enum: ['personal', 'home', 'education', 'vehicle', 'business'], required: true, immutable: true },
    requestedAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    approvedAmount: { type: mongoose.Schema.Types.Decimal128, default: null },
    tenureMonths: { type: Number, required: true, min: 3, max: 360 },
    purpose: { type: String, trim: true, required: true },
    existingEmi: { type: mongoose.Schema.Types.Decimal128, default: '0.00' },
    hasExistingLoans: { type: Boolean, default: false },

    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, immutable: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    documentsRequested: { type: [String], default: [] },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'documents_required', 'manager_review', 'approved', 'rejected', 'disbursed', 'cancelled'],
      default: 'draft'
    },
    remarks: { type: [remarkSchema], default: [] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    employeeRecommendedAmount: { type: mongoose.Schema.Types.Decimal128, default: null },
    managerRecommendedAmount: { type: mongoose.Schema.Types.Decimal128, default: null },
    managerReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    disbursedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

loanApplicationSchema.index({ customer: 1, createdAt: -1 });
loanApplicationSchema.index({ loanType: 1, status: 1 });

loanApplicationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    for (const key of ['monthlyIncome', 'requestedAmount', 'approvedAmount', 'existingEmi', 'employeeRecommendedAmount']) {
      if (ret[key] && ret[key]._bsontype === 'Decimal128') ret[key] = ret[key].toString();
    }
    return ret;
  }
});
loanApplicationSchema.index({ status: 1 });
loanApplicationSchema.index({ branch: 1, status: 1 });
loanApplicationSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
