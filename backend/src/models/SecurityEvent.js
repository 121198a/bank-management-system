const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED',
        'PASSWORD_RESET_REQUESTED', 'PASSWORD_CHANGED',
        'PERMISSION_CHANGED', 'ROLE_CHANGED',
        'SUSPICIOUS_LOGIN', 'REFRESH_TOKEN_REUSE_DETECTED',
        'PRIVILEGE_ESCALATION_ATTEMPT'
      ],
      required: true,
      immutable: true
    },
    // Nullable: a failed login with an unrecognized email has no user to link.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
