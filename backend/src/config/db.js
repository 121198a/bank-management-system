const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      minPoolSize: 2,
      autoIndex: env.nodeEnv !== 'production'
    });
    if (env.requireReplicaSet) {
      const hello = await conn.connection.db.admin().command({ hello: 1 });
      if (!hello.setName) {
        await mongoose.disconnect();
        throw new Error('MongoDB replica set is required for atomic financial transactions. Use MongoDB Atlas or configure a local replica set.');
      }
    }
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
