const mongoose = require('mongoose');

const insuranceProductSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, immutable: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['life', 'health', 'vehicle', 'property', 'travel'], required: true },
    description: { type: String, trim: true, default: '' },
    minSumInsured: { type: mongoose.Schema.Types.Decimal128, required: true },
    maxSumInsured: { type: mongoose.Schema.Types.Decimal128, required: true },
    annualPremiumRatePercent: { type: Number, required: true, min: 0.01, max: 100 },
    minTermMonths: { type: Number, required: true, min: 1 },
    maxTermMonths: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

insuranceProductSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('InsuranceProduct', insuranceProductSchema);
