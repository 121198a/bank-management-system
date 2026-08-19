const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const env = require('./config/env');
const requestId = require('./middleware/requestId');
const createRateLimiter = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const kycRoutes = require('./routes/kycRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const branchRoutes = require('./routes/branchRoutes');
const loanRoutes = require('./routes/loanRoutes');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy ? 1 : false);

app.use(requestId);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID', 'X-Document-Type', 'X-File-Name']
}));
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(createRateLimiter({ limit: 120 }));

if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get('/api/health', (_req, res) => res.status(200).json({
  success: true,
  message: 'Banking API is running',
  timestamp: new Date().toISOString()
}));

app.get('/api/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    database: ready ? 'connected' : 'not-ready',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', createRateLimiter({ limit: 10 }), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', createRateLimiter({ limit: 30, keyGenerator: (req) => `${req.ip}:${req.user?._id || 'anonymous'}` }), transactionRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeeRoutes);  
app.use('/api/branches', branchRoutes);
app.use('/api/loans', loanRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
