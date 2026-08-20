const mongoose = require('mongoose');

const contactLogSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['call', 'email', 'sms', 'visit', 'other'], required: true },
    outcome: { type: String, trim: true, required: true, maxlength: 500 },
    contactedAt: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { _id: false }
);

const remarkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const collectionCaseSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, required: true, unique: true, immutable: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanApplication', required: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    overdueAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    dueSince: { type: Date, required: true },

    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },

    status: {
      type: String,
      enum: ['assigned', 'contact_pending', 'customer_contacted', 'promise_to_pay', 'payment_received', 'follow_up_required', 'escalated', 'recovered', 'closed'],
      default: 'assigned'
    },

    contactLog: { type: [contactLogSchema], default: [] },
    promiseToPay: {
      amount: { type: mongoose.Schema.Types.Decimal128, default: null },
      promisedDate: { type: Date, default: null },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      recordedAt: { type: Date, default: null }
    },
    recoveredAmount: { type: mongoose.Schema.Types.Decimal128, default: '0.00' },

    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    escalatedAt: { type: Date, default: null },
    escalationReason: { type: String, trim: true, default: '' },

    remarks: { type: [remarkSchema], default: [] },
    closedAt: { type: Date, default: null },
    closureReason: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

collectionCaseSchema.index({ customer: 1, createdAt: -1 });
collectionCaseSchema.index({ status: 1 });
collectionCaseSchema.index({ assignedEmployee: 1 });
collectionCaseSchema.index({ department: 1, status: 1 });
collectionCaseSchema.index({ branch: 1, status: 1 });

module.exports = mongoose.model('CollectionCase', collectionCaseSchema);
