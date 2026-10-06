// Test bootstrap: set required env BEFORE the app (and config/env.js) loads.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-0123456789abcdef0123456789';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-fedcba9876543210fedcba9876543210';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/unused-in-tests';
process.env.CLIENT_URL = 'http://localhost:5173';
