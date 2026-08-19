const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { escapeRegex } = require('../utils/sanitize');

/**
 * GET /api/audit
 * Admin only - paginated, filterable audit log with actor population.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};

  // Employees with audit.view.branch can inspect their own audit activity.
  // Admins retain the existing global audit view. This keeps the employee
  // audit surface useful without exposing the entire system audit trail.
  if (req.user?.role === 'employee') {
    filter.actor = req.user._id;
  }

  if (req.query.action) filter.action = new RegExp(escapeRegex(req.query.action), 'i');
  if (req.query.targetType) filter.targetType = req.query.targetType;

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  if (req.query.search) {
    const searchRegex = new RegExp(escapeRegex(req.query.search), 'i');
    const matchingUsers = await User.find({
      $or: [{ fullName: searchRegex }, { email: searchRegex }]
    }).select('_id');
    filter.$or = [
      { action: searchRegex },
      { targetType: searchRegex },
      { actor: { $in: matchingUsers.map((u) => u._id) } }
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter)
  ]);

  return new ApiResponse(
    200,
    'Audit logs fetched successfully',
    { logs },
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  ).send(res);
});

module.exports = { listAuditLogs };
