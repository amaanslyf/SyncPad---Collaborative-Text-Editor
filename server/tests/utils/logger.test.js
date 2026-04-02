import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '../../src/utils/logger.js';

describe('Logger Utility', () => {
  it('should create a logger with all log methods', () => {
    const log = createLogger('TestModule');

    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  it('should call console.error for error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger('TestModule');

    log.error('Something went wrong');

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should call console.warn for warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger('TestModule');

    log.warn('Warning message');

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should call console.log for info level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger('TestModule');

    log.info('Info message');

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle Error objects', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger('TestModule');
    const error = new Error('test error');

    log.error('Failed:', error);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle object arguments', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger('TestModule');

    log.info('Data:', { key: 'value', nested: { a: 1 } });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
