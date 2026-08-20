const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, immutable: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    type: {
      type: String,
      enum: [
        'cheque_book', 'passbook', 'internet_banking',
        'address_change', 'phone_change', 'nominee_change', 'other'
      ],
      required: true,
      immutable: true
    },
    status: {
      type: String,
      enum: ['requested', 'under_review', 'approved', 'processing', 'dispatched', 'delivered', 'rejected', 'cancelled', 'completed'],
      default: 'requested'
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    remarks: { type: [remarkSchema], default: [] },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

serviceRequestSchema.index({ customer: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ branch: 1, status: 1 });
serviceRequestSchema.index({ assignedEmployee: 1 });
serviceRequestSchema.index({ type: 1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
