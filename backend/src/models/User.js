const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['admin', 'employee', 'customer'],
      default: 'customer'
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tokenVersion: { type: Number, default: 0, min: 0 },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false
    },
    avatarColor: {
      type: String,
      default: () => '#' + Math.floor(Math.random() * 16777215).toString(16)
    }
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ kycStatus: 1 });
userSchema.index({ fullName: 'text', email: 'text' });

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    address: this.address,
    role: this.role,
    kycStatus: this.kycStatus,
    isActive: this.isActive,
    avatarColor: this.avatarColor,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);
