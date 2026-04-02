/**
 * SyncPad — Structured Logger Utility
 *
 * Provides consistent, leveled logging across the entire server.
 * Each module creates a child logger with its own context tag.
 *
 * Usage:
 *   import { createLogger } from '../utils/logger.js';
 *   const log = createLogger('ModuleName');
 *   log.info('Server started on port', port);
 *   log.error('Failed to connect', { error: err.message, stack: err.stack });
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_ICONS = {
  debug: '🔍',
  info: '✅',
  warn: '⚠️ ',
  error: '❌',
};

const LEVEL_COLORS = {
  debug: '\x1b[90m',   // gray
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Minimum log level from env (default: debug in dev, info in prod)
const currentLevel =
  LOG_LEVELS[process.env.LOG_LEVEL] ??
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug);

/**
 * Format a timestamp for log output
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Safely stringify objects for log output, handling circular refs
 */
function formatArgs(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.message}\n    Stack: ${arg.stack}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Create a logger instance for a specific module/context
 * @param {string} context - Module or component name (e.g., 'WebSocket', 'AuthController')
 * @returns {Object} Logger with debug, info, warn, error methods
 */
export function createLogger(context) {
  const log = (level, ...args) => {
    if (LOG_LEVELS[level] < currentLevel) return;

    const icon = LEVEL_ICONS[level];
    const color = LEVEL_COLORS[level];
    const ts = timestamp();
    const prefix = `${color}${BOLD}[${ts}]${RESET} ${icon} ${color}[${context}]${RESET}`;
    const message = formatArgs(args);

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'debug':
        console.debug(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  };

  return {
    debug: (...args) => log('debug', ...args),
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),
  };
}

export default createLogger;
