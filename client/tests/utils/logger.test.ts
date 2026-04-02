import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../../src/utils/logger';

describe('Logger Utility', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should initialize correctly with prefix', () => {
    const logger = createLogger('TestComponent');
    expect(logger).toBeDefined();
    expect(logger.debug).toBeInstanceOf(Function);
    expect(logger.info).toBeInstanceOf(Function);
  });

  it('should not throw when calling methods in test env', () => {
    // Vitest runs in 'test' environment by default
    const logger = createLogger('TestComponent');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    expect(() => logger.info('Test Info message')).not.toThrow();
    spy.mockRestore();
  });


});
