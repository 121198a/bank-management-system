const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    key: { type: String, required: true, trim: true, immutable: true },
    operation: { type: String, required: true, enum: ['deposit', 'withdraw', 'transfer'], immutable: true },
    requestHash: { type: String, required: true, immutable: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    statusCode: { type: Number, default: null },
    response: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

idempotencyKeySchema.index({ actor: 1, key: 1 }, { unique: true });
idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
