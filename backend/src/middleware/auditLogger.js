const AuditLog = require('../models/AuditLog');

/**
 * Helper to write an audit log entry. Call this directly from controllers
 * after a mutating action succeeds, passing before/after snapshots.
 */
const writeAuditLog = async ({ actor, action, targetType, targetId, before, after, req }) => {
  try {
    await AuditLog.create({
      actor: actor?._id || actor,
      action,
      targetType,
      targetId: targetId || null,
      before: before || null,
      after: after || null,
      ip: req?.ip || '',
      method: req?.method || '',
      path: req?.originalUrl || ''
    });
  } catch (err) {
    // Audit logging failures should never break the main request flow
    console.error('Failed to write audit log:', err.message);
  }
};

module.exports = { writeAuditLog };
