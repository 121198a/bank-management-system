const mongoose = require('mongoose');

const securityIncidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true, immutable: true }, // INC-2026-000001
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'false_positive'], default: 'open' },
    relatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SecurityEvent' }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    resolution: { type: String, trim: true, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

securityIncidentSchema.index({ status: 1, severity: 1 });
securityIncidentSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('SecurityIncident', securityIncidentSchema);
