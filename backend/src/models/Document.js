const mongoose = require('mongoose');

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },

    applicationType: {
      type: String,
      enum: ['loan_application', 'service_request', 'credit_card', 'debit_card', 'kyc_request'],
      required: true,
      immutable: true
    },
    application: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    type: {
      type: String,
      enum: ['identity_proof', 'address_proof', 'pan', 'income_proof', 'salary_slip', 'bank_statement', 'employment_proof', 'other'],
      required: true
    },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, enum: ALLOWED_MIME_TYPES, required: true },
    size: { type: Number, required: true, max: MAX_FILE_SIZE_BYTES },
    storageReference: { type: String, required: true, select: false },
    status: { type: String, enum: ['uploaded', 'verified', 'rejected'], default: 'uploaded' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

documentSchema.index({ applicationType: 1, application: 1 });
documentSchema.index({ owner: 1 });

module.exports = mongoose.model('Document', documentSchema);
module.exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
module.exports.MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
