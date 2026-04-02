import { createLogger } from '../utils/logger.js';

const log = createLogger('ErrorHandler');

/**
 * Centralized error handling middleware
 * Must have 4 params for Express to recognize it as error middleware
 */
const errorHandler = (err, req, res, _next) => {
  // Log the full error with context
  log.error(`${req.method} ${req.originalUrl} failed:`, {
    message: err.message,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    log.warn('Validation error details:', messages);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    log.warn(`Duplicate key on field: ${field}`);
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    log.warn(`Invalid ObjectId: ${err.value}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // JWT error (shouldn't reach here normally, but safety net)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    log.warn(`JWT error: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: 'Authentication error',
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
