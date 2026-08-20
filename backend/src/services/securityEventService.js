const SecurityEvent = require('../models/SecurityEvent');

const logSecurityEvent = async ({ type, user = null, email = '', req, severity = 'low', metadata = {} }) => {
  try {
    await SecurityEvent.create({
      type,
      user,
      email,
      ip: req?.ip || '',
      userAgent: req?.headers?.['user-agent'] || '',
      severity,
      metadata
    });
  } catch (error) {
    // Never let security logging itself break the calling flow (e.g. login).
    console.error(`Security event logging failed: ${error.message}`);
  }
};

/**
 * Rule: N failed logins for the same email within a window => suspicious.
 * Explainable, not ML — matches Section 17's "no unrealistic AI fraud system".
 */
const checkRepeatedFailedLogins = async (email, { windowMs = 15 * 60 * 1000, threshold = 5 } = {}) => {
  const since = new Date(Date.now() - windowMs);
  const count = await SecurityEvent.countDocuments({ type: 'LOGIN_FAILED', email, createdAt: { $gte: since } });
  return count >= threshold;
};

module.exports = { logSecurityEvent, checkRepeatedFailedLogins };
