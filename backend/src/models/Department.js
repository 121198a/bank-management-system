const mongoose = require('mongoose');


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
    
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

departmentSchema.index({ status: 1 });

module.exports = mongoose.model('Department', departmentSchema);
module.exports.DEPARTMENT_CODES = DEPARTMENT_CODES;
