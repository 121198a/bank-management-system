const mongoose = require('mongoose');
const connectDB = require('../config/db');
const models = [
  require('../models/User'),
  require('../models/Account'),
  require('../models/Transaction'),
  require('../models/KYCRequest'),
  require('../models/Notification'),
  require('../models/AuditLog'),
  require('../models/IdempotencyKey'),
  require('../models/Counter'),
  require('../models/Branch'),
  require('../models/Department'),
  require('../models/CustomerProfile'),
  require('../models/EmployeeProfile'),
  require('../models/ServiceRequest'),
  require('../models/DebitCard'),
  require('../models/CreditCard'),
  require('../models/FixedDeposit'),
  require('../models/LoanApplication'),
  require('../models/InsuranceProduct'),
  require('../models/InsurancePolicy'),
  require('../models/InsuranceClaim'),
  require('../models/CollectionCase'),
  require('../models/SalesLead'),
  require('../models/SecurityEvent'),
  require('../models/SecurityIncident'),
  require('../models/FraudAlert'),
  require('../models/Document')
];

(async () => {
  try {
    await connectDB();
    for (const Model of models) {
      await Model.createIndexes();
      console.log(`Indexes ensured: ${Model.modelName}`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(`Index creation failed: ${err.message}`);
    try { await mongoose.disconnect(); } catch (_) { /* noop */ }
    process.exit(1);
  }
})();
