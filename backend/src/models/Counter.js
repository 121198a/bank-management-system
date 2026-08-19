const mongoose = require('mongoose');

// Backs sequential human-readable IDs (customerId, employeeId, branchId,
// requestId, etc). One document per counter key, incremented atomically.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "customerId:2026"
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', counterSchema);
