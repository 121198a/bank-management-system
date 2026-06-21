const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    relatedAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    type: {
      type: String,
      enum: ['deposit', 'withdraw', 'transfer_in', 'transfer_out'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero']
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

transactionSchema.index({ account: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
