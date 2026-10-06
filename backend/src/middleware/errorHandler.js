const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `Duplicate value for field: ${field}` : 'Duplicate value';
    errors = field ? [{ field, message: `${field} already exists` }] : [];
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    // Do not echo the client-supplied value back (reflection / log-injection risk).
    message = `Invalid value for ${err.path}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Never leak internal error text (DB errors, paths, library messages) for
  // unexpected failures. ApiError instances carry intentionally public messages.
  const isExpected = err instanceof ApiError || statusCode < 500;
  if (!isExpected && env.nodeEnv !== 'development') {
    message = 'Internal Server Error';
    errors = [];
  }
  if (statusCode >= 500 && env.nodeEnv !== 'test') {
    console.error(`[${req.requestId || 'no-request-id'}] ${req.method} ${req.originalUrl.split('?')[0]} -> ${statusCode}: ${err.name}`);
  }

  const response = {
    success: false,
    statusCode,
    message,
    errors,
    ...(req.requestId ? { requestId: req.requestId } : {})
  };

  if (env.nodeEnv === 'development' && !(err instanceof ApiError)) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
