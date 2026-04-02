import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Database');

const connectDB = async () => {
  try {
    log.info('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Modern mongoose doesn't need most options — they're defaults now
    });
    log.info(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    log.error('MongoDB connection failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  log.info('Mongoose connection established');
});

mongoose.connection.on('disconnected', () => {
  log.warn('MongoDB disconnected. Mongoose will attempt reconnect automatically.');
});

mongoose.connection.on('error', (err) => {
  log.error('MongoDB connection error:', {
    message: err.message,
    code: err.code,
  });
});

mongoose.connection.on('reconnected', () => {
  log.info('MongoDB reconnected successfully');
});

export default connectDB;
