import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLogInfo, mockLogWarning, mockLogError } = vi.hoisted(() => ({
  mockLogInfo: vi.fn(),
  mockLogWarning: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  default: () => ({
    info: mockLogInfo,
    warn: mockLogWarning,
    error: mockLogError,
  }),
  createLogger: () => ({
    info: mockLogInfo,
    warn: mockLogWarning,
    error: mockLogError,
  }),
}));

import requestLogger from '../../src/middleware/logger.js';

describe('Request Logger Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log HTTP 200 as INFO', () => {
    const req = { method: 'GET', originalUrl: '/api/test' };
    
    // Mock res object that mimics EventEmitter behavior for res.on('finish')
    let finishCallback;
    const res = {
      statusCode: 200,
      on: vi.fn((event, cb) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    
    // Simulate finishing the response
    finishCallback();
    
    expect(mockLogInfo).toHaveBeenCalled();
    expect(mockLogWarning).not.toHaveBeenCalled();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('should log HTTP 400 as WARN', () => {
    const req = { method: 'POST', originalUrl: '/api/bad' };
    let finishCallback;
    const res = {
      statusCode: 404,
      on: vi.fn((event, cb) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    
    requestLogger(req, res, vi.fn());
    finishCallback();
    
    expect(mockLogWarning).toHaveBeenCalled();
    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockLogInfo).not.toHaveBeenCalled();
  });

  it('should log HTTP 500 as ERROR', () => {
    const req = { method: 'DELETE', originalUrl: '/api/fail' };
    let finishCallback;
    const res = {
      statusCode: 500,
      on: vi.fn((event, cb) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    
    requestLogger(req, res, vi.fn());
    finishCallback();
    
    expect(mockLogError).toHaveBeenCalled();
    expect(mockLogWarning).not.toHaveBeenCalled();
    expect(mockLogInfo).not.toHaveBeenCalled();
  });
});
