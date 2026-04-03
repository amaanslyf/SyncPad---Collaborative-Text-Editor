/**
 * SyncPad — Client-side Logger Utility
 *
 * Structured logging for the React frontend.
 * Suppresses debug/info in production builds.
 *
 * Usage:
 *   import { createLogger } from '@/utils/logger';
 *   const log = createLogger('ComponentName');
 *   log.info('Mounted successfully');
 *   log.error('Failed to fetch', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV;
const currentLevel = isDev ? LOG_LEVELS.debug : LOG_LEVELS.warn;

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #757388; font-weight: normal;',
  info: 'color: #FFFFFF; font-weight: bold;',
  warn: 'color: #FFB800; font-weight: bold;',
  error: 'color: #FF6E84; font-weight: bold;',
};

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(context: string): Logger {
  const log = (level: LogLevel, ...args: unknown[]) => {
    if (LOG_LEVELS[level] < currentLevel) return;

    const style = LEVEL_STYLES[level];
    const prefix = `%c[${context}]`;

    switch (level) {
      case 'error':
        console.error(prefix, style, ...args);
        break;
      case 'warn':
        console.warn(prefix, style, ...args);
        break;
      case 'debug':
        console.debug(prefix, style, ...args);
        break;
      default:
        console.log(prefix, style, ...args);
    }
  };

  return {
    debug: (...args) => log('debug', ...args),
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),
  };
}
