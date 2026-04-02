import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/models/User.js', () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import User from '../../src/models/User.js';
import { authenticate } from '../../src/middleware/auth.js';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-key';

const mockReq = (overrides = {}) => ({
  headers: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no Authorization header', async () => {
    const req = mockReq();
    const res = mockRes();

    await authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Authentication required'),
      })
    );
  });

  it('should return 401 if token is invalid', async () => {
    const req = mockReq({
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = mockRes();

    await authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Invalid token'),
      })
    );
  });

  it('should return 401 if user not found for valid token', async () => {
    const token = jwt.sign({ id: 'nonexistent' }, process.env.JWT_SECRET);
    User.findById.mockResolvedValue(null);

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();

    await authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should attach user to request and call next on valid token', async () => {
    const token = jwt.sign({ id: 'user123' }, process.env.JWT_SECRET);
    User.findById.mockResolvedValue({
      _id: { toString: () => 'user123' },
      displayName: 'Test User',
      email: 'test@test.com',
      color: '#a8a4ff',
    });

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();

    await authenticate(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toEqual(
      expect.objectContaining({
        id: 'user123',
        displayName: 'Test User',
        email: 'test@test.com',
      })
    );
  });

  it('should return 401 for expired token', async () => {
    const token = jwt.sign({ id: 'user123' }, process.env.JWT_SECRET, { expiresIn: '0s' });

    // Wait a tick for expiry
    await new Promise((r) => setTimeout(r, 10));

    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();

    await authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('expired'),
      })
    );
  });
});
