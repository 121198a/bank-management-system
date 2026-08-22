const crypto = require('crypto');

/**
 * Generates a unique 10-digit account number.
 * Format: 2-digit branch code (40) + 8 random digits.
 */
const generateAccountNumber = () => {
  const branchCode = '40';
  const randomDigits = crypto.randomInt(10000000, 99999999).toString();
  return `${branchCode}${randomDigits}`;
};

module.exports = generateAccountNumber;
