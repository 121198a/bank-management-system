const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

const startServer = async () => {
  await connectDB();
  const server = app.listen(env.port, () => {
    console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down gracefully.`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection [${err?.message || 'unknown'}]`);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception [${err?.message || 'unknown'}]`);
    shutdown('uncaughtException');
  });
};

startServer().catch((err) => {
  console.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
