const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SENSITIVE_KEYS = /password|token|secret|otp|document(number|url)?/i;

const sanitizeForAudit = (value) => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeForAudit);
  if (typeof value !== 'object') return value;

  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEYS.test(key)) {
      output[key] = '[REDACTED]';
    } else if (key === 'ip' || key === 'user-agent') {
      output[key] = nested;
    } else {
      output[key] = sanitizeForAudit(nested);
    }
  }
  return output;
};

module.exports = { escapeRegex, sanitizeForAudit };
