const SalesLead = require('../models/SalesLead');
const EmployeeProfile = require('../models/EmployeeProfile');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { generateYearScopedId } = require('../utils/sequence');
const { loadEmployeeContext, requirePermissions, buildScopeFilter, canAccessResource, getTeamUserIds } = require('../services/orgScope');

const LEAD_SCOPE_FIELDS = { branchField: 'branch', departmentField: 'department', assigneeField: 'assignedEmployee' };

const getEmployeeScope = async (userId, permission) => {
  const employee = await loadEmployeeContext(userId);
  requirePermissions(employee, permission);
  return employee;
};

const createLead = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'sales.lead.create');
  const salesDept = await Department.findOne({ code: 'SALES' }).select('_id');
  const leadId = await generateYearScopedId('LEAD');

  const lead = await SalesLead.create({
    leadId,
    fullName: req.body.fullName,
    email: req.body.email || '',
    phone: req.body.phone,
    productInterest: req.body.productInterest,
    source: req.body.source || 'other',
    department: salesDept?._id || null,
    status: 'new'
  });

  await writeAuditLog({ actor: req.user, action: 'SALES_LEAD_CREATED', targetType: 'SalesLead', targetId: lead._id, after: lead.toJSON(), req });
  return new ApiResponse(201, 'Lead created', { lead }).send(res);
});

const assignLead = asyncHandler(async (req, res) => {
  const employee = await getEmployeeScope(req.user._id, 'sales.lead.assign');
  const lead = await SalesLead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');
  if (!(await canAccessResource(employee, lead, LEAD_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to reassign this lead');
  if (['converted', 'lost', 'closed'].includes(lead.status)) throw new ApiError(400, `Cannot reassign a ${lead.status} lead`);

  const assigneeProfile = await EmployeeProfile.findOne({ user: req.body.assignedEmployeeId, status: 'active' });
  if (!assigneeProfile) throw new ApiError(400, 'assignedEmployeeId must be an active employee');

  const before = lead.toJSON();
  lead.assignedEmployee = req.body.assignedEmployeeId;
  lead.assignedBy = req.user._id;
  if (lead.status === 'new') lead.status = 'assigned';
  await lead.save();

  await writeAuditLog({ actor: req.user, action: 'SALES_LEAD_ASSIGNED', targetType: 'SalesLead', targetId: lead._id, before, after: lead.toJSON(), req });
  return new ApiResponse(200, 'Lead assigned', { lead }).send(res);
});

const listLeads = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const employee = await getEmployeeScope(req.user._id, 'sales.view');
  Object.assign(filter, await buildScopeFilter(employee, LEAD_SCOPE_FIELDS));
  const leads = await SalesLead.find(filter).populate('assignedEmployee', 'fullName email').sort({ createdAt: -1 });
  return new ApiResponse(200, 'Leads fetched', { leads }).send(res);
});

const getLeadById = asyncHandler(async (req, res) => {
  const employee = await getEmployeeScope(req.user._id, 'sales.view');
  const lead = await SalesLead.findById(req.params.id).populate('assignedEmployee', 'fullName email');
  if (!lead) throw new ApiError(404, 'Lead not found');
  if (!(await canAccessResource(employee, lead, LEAD_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to access this lead');
  return new ApiResponse(200, 'Lead fetched', { lead }).send(res);
});

const assertCanWorkLead = async (lead, userId) => {
  const employee = await getEmployeeScope(userId, 'sales.lead.update');
  if (!(await canAccessResource(employee, lead, LEAD_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to update this lead');
  return employee;
};

const VALID_TRANSITIONS = {
  new: ['assigned', 'contacted', 'lost'],
  assigned: ['contacted', 'lost'],
  contacted: ['interested', 'lost'],
  interested: ['documents_required', 'application_started', 'lost'],
  documents_required: ['application_started', 'lost'],
  application_started: ['converted', 'lost'],
  converted: [],
  lost: [],
  closed: []
};

const updateLeadStatus = asyncHandler(async (req, res) => {
  const lead = await SalesLead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');
  await assertCanWorkLead(lead, req.user._id);

  const { status } = req.body;
  if (!VALID_TRANSITIONS[lead.status]?.includes(status)) {
    throw new ApiError(400, `Cannot move lead from ${lead.status} to ${status}`);
  }
  if (status === 'lost' && !req.body.lostReason) {
    throw new ApiError(400, 'lostReason is required when marking a lead as lost');
  }

  const before = lead.toJSON();
  lead.status = status;
  if (status === 'lost') lead.lostReason = req.body.lostReason;
  if (req.body.text) lead.remarks.push({ text: req.body.text, by: req.user._id, at: new Date() });
  await lead.save();

  await writeAuditLog({ actor: req.user, action: 'SALES_LEAD_STATUS_UPDATED', targetType: 'SalesLead', targetId: lead._id, before, after: lead.toJSON(), req });
  return new ApiResponse(200, 'Lead status updated', { lead }).send(res);
});

const addLeadRemark = asyncHandler(async (req, res) => {
  const lead = await SalesLead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');
  await assertCanWorkLead(lead, req.user._id);
  const before = lead.toJSON();
  lead.remarks.push({ text: req.body.text, by: req.user._id, at: new Date() });
  await lead.save();
  await writeAuditLog({ actor: req.user, action: 'SALES_LEAD_REMARK_ADDED', targetType: 'SalesLead', targetId: lead._id, before, after: lead.toJSON(), req });
  return new ApiResponse(200, 'Remark added', { lead }).send(res);
});

// Marks the lead converted and links to the resulting resource
// (account/loan/insurance/card/FD) created via the respective module —
// this endpoint does not itself create that resource, just records the link.
const convertLead = asyncHandler(async (req, res) => {
  const lead = await SalesLead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');
  await assertCanWorkLead(lead, req.user._id);
  if (!VALID_TRANSITIONS[lead.status]?.includes('converted')) {
    throw new ApiError(400, `Cannot convert a lead from status ${lead.status}`);
  }

  const before = lead.toJSON();
  lead.status = 'converted';
  lead.convertedTo = { type: req.body.convertedType, referenceId: req.body.referenceId };
  if (req.body.customerId) lead.customer = req.body.customerId;
  await lead.save();

  await writeAuditLog({ actor: req.user, action: 'SALES_LEAD_CONVERTED', targetType: 'SalesLead', targetId: lead._id, before, after: lead.toJSON(), req });
  return new ApiResponse(200, 'Lead marked as converted', { lead }).send(res);
});

const getPerformance = asyncHandler(async (req, res) => {
  const employee = await getEmployeeScope(req.user._id, 'sales.performance.view');
  const scopeFilter = await buildScopeFilter(employee, LEAD_SCOPE_FIELDS);

  // Aggregate per-employee conversion stats within this employee's scope
  // (their team if manager, their department if department_head, everyone
  // if bank_head — buildScopeFilter already encodes that).
  const rows = await SalesLead.aggregate([
    { $match: scopeFilter },
    { $group: {
      _id: '$assignedEmployee',
      totalLeads: { $sum: 1 },
      converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
      lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } }
    } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employee' } },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $project: {
      employeeId: '$_id', employeeName: '$employee.fullName', totalLeads: 1, converted: 1, lost: 1,
      conversionRate: { $cond: [{ $gt: ['$totalLeads', 0] }, { $round: [{ $multiply: [{ $divide: ['$converted', '$totalLeads'] }, 100] }, 1] }, 0] }
    } },
    { $sort: { converted: -1 } }
  ]);

  return new ApiResponse(200, 'Sales performance fetched', { performance: rows }).send(res);
});

module.exports = { createLead, assignLead, listLeads, getLeadById, updateLeadStatus, addLeadRemark, convertLead, getPerformance };
