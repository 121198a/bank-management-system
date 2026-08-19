const mongoose = require('mongoose');

// Granular permission strings layered on top of the existing role check.
// authorize('employee') still gates by role; requirePermission() (added in
// Phase C) checks these for finer-grained actions within that role.
const PERMISSIONS = [
  'customer.view',
  'account.review',
  'account.approve',
  'loan.review',
  'card.review',
  'service.process',
  'kyc.review',
  'audit.view.branch'
];

const employeeProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      immutable: true
    },
    // e.g. EMP-2026-0001
    employeeId: { type: String, required: true, unique: true, immutable: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    designation: { type: String, trim: true, default: 'Banking Associate' },
    permissions: {
      type: [{ type: String, enum: PERMISSIONS }],
      default: ['customer.view', 'account.review', 'kyc.review', 'service.process']
    },
    // When true, bypasses branch-scoping in employee queries (rare, admin-granted).
    allBranchAccess: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

employeeProfileSchema.index({ branch: 1 });
employeeProfileSchema.index({ status: 1 });

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);
module.exports.PERMISSIONS = PERMISSIONS;
