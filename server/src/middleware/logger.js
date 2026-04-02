import { createLogger } from '../utils/logger.js';

const log = createLogger('HTTP');

/**
 * Request logger middleware
 * Logs method, URL, status code, and response time
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    log[level](`${req.method} ${req.originalUrl} → ${statusCode} (${duration}ms)`);
  });

  next();
};

export default requestLogger;
