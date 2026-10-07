const mongoose = require('mongoose');
const { encrypt, decrypt, blindIndex, last4 } = require('../utils/fieldCrypto');

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
    // Encrypted at rest (AES-256-GCM) when KYC_ENCRYPTION_KEY is set; the getter
    // transparently decrypts, and legacy plaintext values still read correctly.
    documentNumber: {
      type: String,
      required: true,
      set: (v) => (typeof v === 'string' ? encrypt(v.trim()) : v),
      get: (v) => decrypt(v)
    },
    // Keyed hash for exact-match search, and last 4 characters for display.
    documentNumberIndex: { type: String, select: false },
    documentNumberLast4: { type: String, default: '' },
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
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

// Keep the blind index and last-4 in sync with whatever plaintext is being saved.
kycRequestSchema.pre('validate', function setDocumentDerivedFields(next) {
  if (this.isModified('documentNumber')) {
    const plain = this.documentNumber; // getter returns plaintext
    this.documentNumberIndex = blindIndex(plain);
    this.documentNumberLast4 = last4(plain);
  }
  next();
});

kycRequestSchema.index({ user: 1 });
kycRequestSchema.index({ status: 1 });
kycRequestSchema.index({ documentNumberIndex: 1 }, { sparse: true });
kycRequestSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('KYCRequest', kycRequestSchema);
