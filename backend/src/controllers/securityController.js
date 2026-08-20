const SecurityEvent = require('../models/SecurityEvent');
const SecurityIncident = require('../models/SecurityIncident');
const FraudAlert = require('../models/FraudAlert');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { writeAuditLog } = require('../middleware/auditLogger');
const { generateYearScopedId } = require('../utils/sequence');
const { loadEmployeeContext, requirePermissions } = require('../services/orgScope');

const getEmployeeScope = async (userId, permission) => {
  const employee = await loadEmployeeContext(userId);
  requirePermissions(employee, permission);
  return employee;
};

// ==================== SECURITY EVENTS (read-only feed) ====================

const listSecurityEvents = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'security.alert.view');
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.severity) filter.severity = req.query.severity;
  const events = await SecurityEvent.find(filter).sort({ createdAt: -1 }).limit(200);
  return new ApiResponse(200, 'Security events fetched', { events }).send(res);
});

// ==================== INCIDENTS ====================

const createIncident = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'security.incident.create');
  const incidentId = await generateYearScopedId('INC');
  const incident = await SecurityIncident.create({
    incidentId,
    title: req.body.title,
    description: req.body.description,
    severity: req.body.severity || 'medium',
    relatedEvents: req.body.relatedEventIds || [],
    assignedTo: req.body.assignedTo || null,
    createdBy: req.user._id
  });
  await writeAuditLog({ actor: req.user, action: 'SECURITY_INCIDENT_CREATED', targetType: 'SecurityIncident', targetId: incident._id, after: incident.toJSON(), req });
  return new ApiResponse(201, 'Security incident created', { incident }).send(res);
});

const listIncidents = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'security.alert.view');
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  const incidents = await SecurityIncident.find(filter).populate('assignedTo', 'fullName email').sort({ createdAt: -1 });
  return new ApiResponse(200, 'Security incidents fetched', { incidents }).send(res);
});

const resolveIncident = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'security.incident.resolve');
  const incident = await SecurityIncident.findById(req.params.id);
  if (!incident) throw new ApiError(404, 'Security incident not found');
  if (['resolved', 'false_positive'].includes(incident.status)) throw new ApiError(400, `Incident is already ${incident.status}`);

  const before = incident.toJSON();
  incident.status = req.body.status;
  incident.resolution = req.body.resolution;
  incident.resolvedBy = req.user._id;
  incident.resolvedAt = new Date();
  await incident.save();

  await writeAuditLog({ actor: req.user, action: 'SECURITY_INCIDENT_RESOLVED', targetType: 'SecurityIncident', targetId: incident._id, before, after: incident.toJSON(), req });
  return new ApiResponse(200, 'Incident updated', { incident }).send(res);
});

// ==================== FRAUD ALERTS ====================

const listFraudAlerts = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'security.alert.view');
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  const alerts = await FraudAlert.find(filter)
    .populate('relatedUser', 'fullName email')
    .populate('relatedAccount', 'accountNumber')
    .sort({ createdAt: -1 });
  return new ApiResponse(200, 'Fraud alerts fetched', { alerts }).send(res);
});

const reviewFraudAlert = asyncHandler(async (req, res) => {
  await getEmployeeScope(req.user._id, 'security.alert.investigate');
  const alert = await FraudAlert.findById(req.params.id);
  if (!alert) throw new ApiError(404, 'Fraud alert not found');
  if (['resolved', 'false_positive'].includes(alert.status)) throw new ApiError(400, `Alert is already ${alert.status}`);

  const before = alert.toJSON();
  alert.status = req.body.status;
  alert.resolution = req.body.resolution || '';
  alert.reviewedBy = req.user._id;
  if (['resolved', 'false_positive'].includes(req.body.status)) alert.resolvedAt = new Date();
  await alert.save();

  await writeAuditLog({ actor: req.user, action: 'FRAUD_ALERT_REVIEWED', targetType: 'FraudAlert', targetId: alert._id, before, after: alert.toJSON(), req });
  return new ApiResponse(200, 'Fraud alert updated', { alert }).send(res);
});

module.exports = { listSecurityEvents, createIncident, listIncidents, resolveIncident, listFraudAlerts, reviewFraudAlert };
