import { describe, it, expect, vi, beforeEach } from 'vitest';
import errorHandler from '../../src/middleware/errorHandler.js';

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();
const mockReq = { method: 'POST', originalUrl: '/test' };

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'production'; // To prevent stack traces in tests
  });

  it('should format ValidationError appropriately', () => {
    const err = new Error();
    err.name = 'ValidationError';
    err.errors = {
      email: { message: 'Email is required' },
      password: { message: 'Password is required' }
    };
    
    const res = mockRes();
    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation failed',
        errors: ['Email is required', 'Password is required'],
      })
    );
  });

  it('should format duplicate key error (11000)', () => {
    const err = new Error();
    err.code = 11000;
    err.keyValue = { email: 'duplicate@test.com' };
    
    const res = mockRes();
    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'A record with this email already exists',
      })
    );
  });

  it('should format CastError (Invalid ID)', () => {
    const err = new Error();
    err.name = 'CastError';
    err.value = 'invalid-id';
    
    const res = mockRes();
    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid ID format',
      })
    );
  });

  it('should format JsonWebTokenError', () => {
    const err = new Error();
    err.name = 'JsonWebTokenError';
    
    const res = mockRes();
    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Authentication error',
      })
    );
  });

  it('should return 500 server error by default', () => {
    const err = new Error('Generic Server Failure');
    
    const res = mockRes();
    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Generic Server Failure',
      })
    );
  });
});
