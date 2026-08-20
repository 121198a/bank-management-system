const crypto = require('crypto');


const generateAccountNumber = () => {
  const branchCode = '40';
  const randomDigits = crypto.randomInt(10000000, 99999999).toString();
  return `${branchCode}${randomDigits}`;
};

module.exports = generateAccountNumber;
