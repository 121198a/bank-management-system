const mongoose = require('mongoose');

const nomineeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    relation: { type: String, trim: true, default: '' },
    dob: { type: Date, default: null },
    contactNumber: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    relation: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const customerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      immutable: true
    },

    customerId: { type: String, required: true, unique: true, immutable: true },
    dob: { type: Date, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },

    pan: { type: String, trim: true, uppercase: true, select: false, default: '' },
    aadhaarRef: { type: String, trim: true, select: false, default: '' },
    homeBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    preferredBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    nominee: { type: nomineeSchema, default: () => ({}) },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
    avatarUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

customerProfileSchema.index({ homeBranch: 1 });

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
