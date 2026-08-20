const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema(
  { text: { type: String, required: true, trim: true }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const salesLeadSchema = new mongoose.Schema(
  {
    leadId: { type: String, required: true, unique: true, immutable: true }, 
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    productInterest: { type: String, enum: ['account', 'loan', 'insurance', 'card', 'fixed_deposit', 'other'], required: true },
    source: { type: String, enum: ['walk_in', 'referral', 'call_center', 'online', 'campaign', 'other'], default: 'other' },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['new', 'assigned', 'contacted', 'interested', 'documents_required', 'application_started', 'converted', 'lost', 'closed'],
      default: 'new'
    },
    convertedTo: {
      type: { type: String, enum: ['account', 'loan', 'insurance', 'card', 'fixed_deposit', null], default: null },
      referenceId: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    lostReason: { type: String, trim: true, default: '' },
    remarks: { type: [remarkSchema], default: [] }
  },
  { timestamps: true }
);

salesLeadSchema.index({ assignedEmployee: 1, status: 1 });
salesLeadSchema.index({ department: 1, status: 1 });
salesLeadSchema.index({ branch: 1, status: 1 });
salesLeadSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SalesLead', salesLeadSchema);
