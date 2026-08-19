const mongoose = require('mongoose');

const kycRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    documentType: {
      type: String,
      enum: ['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id'],
      required: true
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true
    },
    documentUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

kycRequestSchema.index({ user: 1 });
kycRequestSchema.index({ status: 1 });
kycRequestSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('KYCRequest', kycRequestSchema);
