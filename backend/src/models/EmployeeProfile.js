const mongoose = require('mongoose');

// Granular permission strings layered on top of the existing role check.
// authorize('employee') still gates by role; requirePermission() checks
// these for finer-grained actions within that role.
const PERMISSIONS = [
  'customer.view',
  'account.review',
  'account.approve',
  'loan.review',
  'loan.approve',
  'card.review',
  'service.process',
  'kyc.review',
  'audit.view.branch',
  'audit.view.department',
  'insurance.review',
  'insurance.approve',
  'insurance.claim.review',
  'collection.view',
  'collection.assign',
  'collection.followup',
  'collection.escalate',
  'sales.view',
  'sales.lead.create',
  'sales.lead.assign',
  'sales.lead.update',
  'sales.performance.view',
  'security.alert.view',
  'security.alert.investigate',
  'security.incident.create',
  'security.incident.resolve',
  'audit.export',
  'employee.view',
  'employee.assign'
];
// Position within the department hierarchy — NOT a duplicate of User.role.
// User.role stays the coarse auth gate (admin/employee/customer); orgRole
// is the business-org position *within* the 'employee' role, so a Bank
// Head is still User.role:'employee' + EmployeeProfile.orgRole:'bank_head'.
// This avoids role-enum explosion as new departments/positions get added.
const ORG_ROLES = ['employee', 'manager', 'department_head', 'bank_head'];

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
    // Optional: corporate-department staff (Loan/Insurance/Collection/Sales/
    // IT) commonly work at HQ, not a physical branch. Branch-teller
    // employees (RETAIL_BANKING) still set this as before.
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    orgRole: { type: String, enum: ORG_ROLES, default: 'employee' },
    // Self-referencing reporting line. A department_head/bank_head's chain
    // typically ends in null. Kept nullable rather than defaulting to some
    // placeholder so an unassigned report doesn't silently point at nobody.
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', default: null },
    designation: { type: String, trim: true, default: 'Banking Associate' },
    permissions: {
      type: [{ type: String, enum: PERMISSIONS }],
      default: ['customer.view', 'account.review', 'kyc.review', 'service.process']
    },
    // When true, bypasses branch-scoping in employee queries (rare, admin-granted).
    allBranchAccess: { type: Boolean, default: false },
    // When true, bypasses department-scoping (bank_head/department_head
    // typically have this; regular employees/managers normally don't).
    allDepartmentAccess: { type: Boolean, default: false },
    // 'inactive' kept for backward compatibility with existing
    // deactivate-employee code paths; the finer values are additive.
    status: { type: String, enum: ['active', 'inactive', 'on_leave', 'suspended', 'terminated'], default: 'active' }
  },
  { timestamps: true }
);

employeeProfileSchema.index({ branch: 1 });
employeeProfileSchema.index({ department: 1 });
employeeProfileSchema.index({ manager: 1 });
employeeProfileSchema.index({ status: 1 });

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);
module.exports.PERMISSIONS = PERMISSIONS;
module.exports.ORG_ROLES = ORG_ROLES;
