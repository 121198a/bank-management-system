const mongoose = require('mongoose');


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
    
    employeeId: { type: String, required: true, unique: true, immutable: true },

    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    orgRole: { type: String, enum: ORG_ROLES, default: 'employee' },

    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', default: null },
    designation: { type: String, trim: true, default: 'Banking Associate' },
    permissions: {
      type: [{ type: String, enum: PERMISSIONS }],
      default: ['customer.view', 'account.review', 'kyc.review', 'service.process']
    },


    allBranchAccess: { type: Boolean, default: false },

    allDepartmentAccess: { type: Boolean, default: false },
    
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
