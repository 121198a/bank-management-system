const mongoose = require('mongoose');

const BANK_IFSC_PREFIX = process.env.BANK_IFSC_PREFIX || 'BANK0';

const branchSchema = new mongoose.Schema(
  {
    branchId: { type: String, required: true, unique: true, immutable: true },
    branchName: { type: String, required: true, trim: true },
    // 4-digit code the IFSC is derived from — never hardcode the IFSC itself.
    branchCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{4}$/, 'Branch code must be a 4-digit number']
    },
    ifsc: { type: String, required: true, unique: true, immutable: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'PIN code must be 6 digits']
    },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    workingHours: { type: String, default: '9:30 AM - 4:30 PM (Mon-Fri)' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

branchSchema.pre('validate', function assignIfsc(next) {
  if (!this.ifsc && this.branchCode) {
    this.ifsc = `${BANK_IFSC_PREFIX}${this.branchCode}`;
  }
  next();
});

branchSchema.index({ status: 1 });
branchSchema.index({ city: 1, state: 1 });

module.exports = mongoose.model('Branch', branchSchema);
