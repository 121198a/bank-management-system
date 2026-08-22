const mongoose = require('mongoose');

// Fixed catalog rather than a free-text field — keeps dashboards/permission
// checks predictable. RETAIL_BANKING covers the pre-existing branch/teller
// staff (account approval, KYC, deposits) so every employee ends up with a
// department, not just the five new corporate departments.
const DEPARTMENT_CODES = [
  'RETAIL_BANKING',
  'LOAN',
  'INSURANCE',
  'COLLECTION',
  'SALES',
  'IT_SECURITY'
];

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, enum: DEPARTMENT_CODES, immutable: true },
    description: { type: String, trim: true, default: '' },
    // Denormalized for cheap org-chart/dashboard reads. The controller layer
    // (Phase 3) is responsible for keeping this in sync with whichever
    // EmployeeProfile actually holds orgRole:'department_head' here.
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

departmentSchema.index({ status: 1 });

module.exports = mongoose.model('Department', departmentSchema);
module.exports.DEPARTMENT_CODES = DEPARTMENT_CODES;
