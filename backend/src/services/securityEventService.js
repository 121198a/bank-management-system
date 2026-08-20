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
    console.error(`Security event logging failed: ${error.message}`);
  }
};


const checkRepeatedFailedLogins = async (email, { windowMs = 15 * 60 * 1000, threshold = 5 } = {}) => {
  const since = new Date(Date.now() - windowMs);
  const count = await SecurityEvent.countDocuments({ type: 'LOGIN_FAILED', email, createdAt: { $gte: since } });
  return count >= threshold;
};

module.exports = { logSecurityEvent, checkRepeatedFailedLogins };
