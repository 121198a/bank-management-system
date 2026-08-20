const CollectionCase = require('../models/CollectionCase');
const LoanApplication = require('../models/LoanApplication');
const EmployeeProfile = require('../models/EmployeeProfile');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { toDecimal128, decimalToString, compareMoney, addMoney } = require('../utils/money');
const { generateYearScopedId } = require('../utils/sequence');
const { loadEmployeeContext, requirePermissions, buildScopeFilter, canAccessResource } = require('../services/orgScope');

// Cases are scoped by department/branch AND by assignment, so a manager
// sees their team's cases (via assigneeField) without needing department-
// wide access, matching Section 10's "managers can see their team's cases".
const CASE_SCOPE_FIELDS = { branchField: 'branch', departmentField: 'department', assigneeField: 'assignedEmployee' };

const serializeCase = (c) => {
  const value = c?.toJSON ? c.toJSON() : c;
  if (!value) return value;
  for (const key of ['overdueAmount', 'recoveredAmount']) {
    if (value[key] && typeof value[key] === 'object' && value[key].$numberDecimal) value[key] = value[key].$numberDecimal;
  }
  if (value.promiseToPay?.amount && typeof value.promiseToPay.amount === 'object' && value.promiseToPay.amount.$numberDecimal) {
    value.promiseToPay.amount = value.promiseToPay.amount.$numberDecimal;
  }
  return value;
};

const getEmployeeScope = async (userId, permission) => {
  const employee = await loadEmployeeContext(userId);
  requirePermissions(employee, permission);
  return employee;
};

const notifyUser = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch (error) {
    console.error(`Collection notification failed: ${error.message}`);
  }
};

const createCase = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'collection.assign');

  const loan = await LoanApplication.findOne({ _id: req.body.loanId, status: 'disbursed' });
  if (!loan) throw new ApiError(400, 'A valid disbursed loan is required to open a collection case');

  const existingOpen = await CollectionCase.findOne({ loan: loan._id, status: { $nin: ['recovered', 'closed'] } });
  if (existingOpen) throw new ApiError(409, `An open collection case (${existingOpen.caseNumber}) already exists for this loan`);

  let assignedEmployee = null;
  if (req.body.assignedEmployeeId) {
    const assigneeProfile = await EmployeeProfile.findOne({ user: req.body.assignedEmployeeId, status: 'active' });
    if (!assigneeProfile) throw new ApiError(400, 'assignedEmployeeId must be an active employee');
    assignedEmployee = req.body.assignedEmployeeId;
  }

  const collectionDept = await Department.findOne({ code: 'COLLECTION' }).select('_id');
  const caseNumber = await generateYearScopedId('COL');

  const collectionCase = await CollectionCase.create({
    caseNumber,
    loan: loan._id,
    customer: loan.customer,
    branch: loan.branch,
    department: collectionDept?._id || null,
    overdueAmount: toDecimal128(String(req.body.overdueAmount)),
    dueSince: req.body.dueSince,
    assignedEmployee,
    assignedBy: req.user._id,
    priority: req.body.priority || 'medium',
    status: assignedEmployee ? 'assigned' : 'contact_pending'
  });

  await writeAuditLog({ actor: req.user, action: 'COLLECTION_CASE_CREATED', targetType: 'CollectionCase', targetId: collectionCase._id, after: serializeCase(collectionCase), req });
  if (assignedEmployee) {
    await notifyUser(assignedEmployee, 'New Collection Case Assigned', `Case ${caseNumber} has been assigned to you.`, 'info');
  }
  return new ApiResponse(201, 'Collection case created', { case: serializeCase(collectionCase) }).send(res);
});

const assignCase = asyncHandler(async (req, res) => {
  const employee = await getEmployeeScope(req.user._id, 'collection.assign');
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  if (!(await canAccessResource(employee, collectionCase, CASE_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to reassign this case');
  if (['recovered', 'closed'].includes(collectionCase.status)) throw new ApiError(400, `Cannot reassign a ${collectionCase.status} case`);

  const assigneeProfile = await EmployeeProfile.findOne({ user: req.body.assignedEmployeeId, status: 'active' });
  if (!assigneeProfile) throw new ApiError(400, 'assignedEmployeeId must be an active employee');

  const before = serializeCase(collectionCase);
  collectionCase.assignedEmployee = req.body.assignedEmployeeId;
  collectionCase.assignedBy = req.user._id;
  if (collectionCase.status === 'contact_pending') collectionCase.status = 'assigned';
  await collectionCase.save();

  await writeAuditLog({ actor: req.user, action: 'COLLECTION_CASE_ASSIGNED', targetType: 'CollectionCase', targetId: collectionCase._id, before, after: serializeCase(collectionCase), req });
  await notifyUser(req.body.assignedEmployeeId, 'Collection Case Assigned', `Case ${collectionCase.caseNumber} has been assigned to you.`, 'info');
  return new ApiResponse(200, 'Case reassigned', { case: serializeCase(collectionCase) }).send(res);
});

const listCases = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;

  if (req.user.role === 'employee') {
    const employee = await getEmployeeScope(req.user._id, 'collection.view');
    Object.assign(filter, await buildScopeFilter(employee, CASE_SCOPE_FIELDS));
  }

  const cases = await CollectionCase.find(filter)
    .populate('loan', 'applicationId loanType requestedAmount')
    .populate('customer', 'fullName email phone')
    .populate('assignedEmployee', 'fullName email')
    .sort({ createdAt: -1 });
  return new ApiResponse(200, 'Collection cases fetched', { cases: cases.map(serializeCase) }).send(res);
});

const getCaseById = asyncHandler(async (req, res) => {
  const collectionCase = await CollectionCase.findById(req.params.id)
    .populate('loan')
    .populate('customer', 'fullName email phone')
    .populate('assignedEmployee', 'fullName email');
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');

  const employee = await getEmployeeScope(req.user._id, 'collection.view');
  if (!(await canAccessResource(employee, collectionCase, CASE_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to access this case');

  return new ApiResponse(200, 'Collection case fetched', { case: serializeCase(collectionCase) }).send(res);
});

const assertCanWorkCase = async (collectionCase, userId) => {
  const employee = await getEmployeeScope(userId, 'collection.followup');
  if (!(await canAccessResource(employee, collectionCase, CASE_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to work on this case');
  return employee;
};

const addContactLog = asyncHandler(async (req, res) => {
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  await assertCanWorkCase(collectionCase, req.user._id);
  if (['recovered', 'closed'].includes(collectionCase.status)) throw new ApiError(400, `Cannot log contact on a ${collectionCase.status} case`);

  const before = serializeCase(collectionCase);
  collectionCase.contactLog.push({ method: req.body.method, outcome: req.body.outcome, by: req.user._id, contactedAt: new Date() });
  if (collectionCase.status === 'assigned' || collectionCase.status === 'contact_pending') {
    collectionCase.status = 'customer_contacted';
  }
  await collectionCase.save();

  await writeAuditLog({ actor: req.user, action: 'COLLECTION_CONTACT_LOGGED', targetType: 'CollectionCase', targetId: collectionCase._id, before, after: serializeCase(collectionCase), req });
  return new ApiResponse(200, 'Contact logged', { case: serializeCase(collectionCase) }).send(res);
});

const recordPromiseToPay = asyncHandler(async (req, res) => {
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  await assertCanWorkCase(collectionCase, req.user._id);
  if (['recovered', 'closed'].includes(collectionCase.status)) throw new ApiError(400, `Cannot record a promise-to-pay on a ${collectionCase.status} case`);

  const amount = toDecimal128(String(req.body.amount));
  const before = serializeCase(collectionCase);
  collectionCase.promiseToPay = { amount, promisedDate: req.body.promisedDate, recordedBy: req.user._id, recordedAt: new Date() };
  collectionCase.status = 'promise_to_pay';
  await collectionCase.save();

  await writeAuditLog({ actor: req.user, action: 'COLLECTION_PROMISE_TO_PAY_RECORDED', targetType: 'CollectionCase', targetId: collectionCase._id, before, after: serializeCase(collectionCase), req });
  return new ApiResponse(200, 'Promise-to-pay recorded', { case: serializeCase(collectionCase) }).send(res);
});

const recordPayment = asyncHandler(async (req, res) => {
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  await assertCanWorkCase(collectionCase, req.user._id);
  if (['recovered', 'closed'].includes(collectionCase.status)) throw new ApiError(400, `Cannot record payment on a ${collectionCase.status} case`);

  const amount = toDecimal128(String(req.body.amount));
  const before = serializeCase(collectionCase);
  collectionCase.recoveredAmount = addMoney(collectionCase.recoveredAmount, amount);
  collectionCase.status = compareMoney(collectionCase.recoveredAmount, collectionCase.overdueAmount) >= 0 ? 'recovered' : 'payment_received';
  await collectionCase.save();

  await writeAuditLog({
    actor: req.user, action: 'COLLECTION_PAYMENT_RECORDED', targetType: 'CollectionCase', targetId: collectionCase._id,
    before, after: serializeCase(collectionCase), req
  });
  return new ApiResponse(200, `Payment of ${decimalToString(amount)} recorded (tracking only — does not post to any account, no repayment ledger exists yet)`, { case: serializeCase(collectionCase) }).send(res);
});

const markFollowUpRequired = asyncHandler(async (req, res) => {
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  await assertCanWorkCase(collectionCase, req.user._id);
  if (['recovered', 'closed'].includes(collectionCase.status)) throw new ApiError(400, `Cannot update a ${collectionCase.status} case`);

  const before = serializeCase(collectionCase);
  collectionCase.status = 'follow_up_required';
  if (req.body.text) collectionCase.remarks.push({ text: req.body.text, by: req.user._id, at: new Date() });
  await collectionCase.save();

  await writeAuditLog({ actor: req.user, action: 'COLLECTION_FOLLOW_UP_MARKED', targetType: 'CollectionCase', targetId: collectionCase._id, before, after: serializeCase(collectionCase), req });
  return new ApiResponse(200, 'Case marked for follow-up', { case: serializeCase(collectionCase) }).send(res);
});

const escalateCase = asyncHandler(async (req, res) => {
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  const employee = await getEmployeeScope(req.user._id, 'collection.escalate');
  if (!(await canAccessResource(employee, collectionCase, CASE_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to escalate this case');
  if (['recovered', 'closed'].includes(collectionCase.status)) throw new ApiError(400, `Cannot escalate a ${collectionCase.status} case`);

  let escalateTo = req.body.escalatedTo;
  if (!escalateTo && employee.manager) {
    const managerProfile = await EmployeeProfile.findById(employee.manager).select('user');
    escalateTo = managerProfile?.user || null;
  }
  if (!escalateTo) throw new ApiError(400, 'No escalation target available — provide escalatedTo or ensure your employee profile has a manager assigned');

  const before = serializeCase(collectionCase);
  collectionCase.status = 'escalated';
  collectionCase.escalatedTo = escalateTo;
  collectionCase.escalatedAt = new Date();
  collectionCase.escalationReason = req.body.reason;
  await collectionCase.save();

  await writeAuditLog({ actor: req.user, action: 'COLLECTION_CASE_ESCALATED', targetType: 'CollectionCase', targetId: collectionCase._id, before, after: serializeCase(collectionCase), req });
  await notifyUser(escalateTo, 'Collection Case Escalated', `Case ${collectionCase.caseNumber} was escalated to you. Reason: ${req.body.reason}`, 'warning');
  return new ApiResponse(200, 'Case escalated', { case: serializeCase(collectionCase) }).send(res);
});

const addCaseRemark = asyncHandler(async (req, res) => {
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  await assertCanWorkCase(collectionCase, req.user._id);

  const before = serializeCase(collectionCase);
  collectionCase.remarks.push({ text: req.body.text, by: req.user._id, at: new Date() });
  await collectionCase.save();
  await writeAuditLog({ actor: req.user, action: 'COLLECTION_REMARK_ADDED', targetType: 'CollectionCase', targetId: collectionCase._id, before, after: serializeCase(collectionCase), req });
  return new ApiResponse(200, 'Remark added', { case: serializeCase(collectionCase) }).send(res);
});

const closeCase = asyncHandler(async (req, res) => {
  const employee = await getEmployeeScope(req.user._id, 'collection.assign');
  const collectionCase = await CollectionCase.findById(req.params.id);
  if (!collectionCase) throw new ApiError(404, 'Collection case not found');
  if (!(await canAccessResource(employee, collectionCase, CASE_SCOPE_FIELDS))) throw new ApiError(403, 'You do not have permission to close this case');
  if (['recovered', 'closed'].includes(collectionCase.status)) throw new ApiError(400, `Case is already ${collectionCase.status}`);

  const before = serializeCase(collectionCase);
  collectionCase.status = 'closed';
  collectionCase.closedAt = new Date();
  collectionCase.closureReason = req.body.reason;
  await collectionCase.save();

  await writeAuditLog({ actor: req.user, action: 'COLLECTION_CASE_CLOSED', targetType: 'CollectionCase', targetId: collectionCase._id, before, after: serializeCase(collectionCase), req });
  return new ApiResponse(200, 'Case closed', { case: serializeCase(collectionCase) }).send(res);
});

module.exports = {
  createCase, assignCase, listCases, getCaseById,
  addContactLog, recordPromiseToPay, recordPayment, markFollowUpRequired,
  escalateCase, addCaseRemark, closeCase
};
