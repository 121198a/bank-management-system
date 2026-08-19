const Counter = require('../models/Counter');

/**
 * Atomically generates the next sequential number for a given key using
 * findOneAndUpdate's $inc, which is race-safe under concurrent requests
 * (unlike reading a count and incrementing in application code).
 *
 * @param {string} key - counter namespace, e.g. "customerId:2026"
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
 * Generates a formatted, year-scoped ID like CUS-2026-000001.
 * @param {string} prefix - e.g. "CUS", "EMP", "SR", "LN", "DC", "CC", "FD"
 * @param {number} padLength - zero-padding width for the sequence part
 */
const generateYearScopedId = async (prefix, padLength = 6) => {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`${prefix}:${year}`);
  return `${prefix}-${year}-${String(seq).padStart(padLength, '0')}`;
};

/**
 * Generates a flat sequential ID like BR-0001 (no year segment) — used for
 * branches, which are few and long-lived rather than issued per-year.
 */
const generateFlatId = async (prefix, padLength = 4) => {
  const seq = await nextSequence(prefix);
  return `${prefix}-${String(seq).padStart(padLength, '0')}`;
};

module.exports = { nextSequence, generateYearScopedId, generateFlatId };
