const AuditLog = require('../models/AuditLog');
const { sanitizeForAudit } = require('../utils/sanitize');

const writeAuditLog = async ({ actor, action, targetType, targetId, before, after, req, session }) => {
  try {
    const payload = {
      actor: actor?._id || actor,
      action,
      targetType,
      targetId: targetId || null,
      before: sanitizeForAudit(before),
      after: sanitizeForAudit(after),
      ip: req?.ip || '',
      method: req?.method || '',
      path: req?.originalUrl || '',
      requestId: req?.requestId || ''
    };
    if (session) await AuditLog.create([payload], { session });
    else await AuditLog.create(payload);
  } catch (err) {
    // Audit failure is surfaced to monitoring in production; it never exposes request data.
    console.error(`Audit log write failed [${req?.requestId || 'no-request-id'}]: ${err.message}`);
  }
};

module.exports = { writeAuditLog };
