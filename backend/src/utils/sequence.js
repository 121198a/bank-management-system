const Counter = require('../models/Counter');

/**
 * @param {string} key 
 * @returns {Promise<number>}
 */
const nextSequence = async (key) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

/**
 * @param {string} prefix
 * @param {number} padLength
 */
const generateYearScopedId = async (prefix, padLength = 6) => {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`${prefix}:${year}`);
  return `${prefix}-${year}-${String(seq).padStart(padLength, '0')}`;
};


const generateFlatId = async (prefix, padLength = 4) => {
  const seq = await nextSequence(prefix);
  return `${prefix}-${String(seq).padStart(padLength, '0')}`;
};

module.exports = { nextSequence, generateYearScopedId, generateFlatId };
