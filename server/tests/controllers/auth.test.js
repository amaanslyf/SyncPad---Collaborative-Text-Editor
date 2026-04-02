import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
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
import { register, login, getMe } from '../../src/controllers/authController.js';

// Test helpers
const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { id: 'user123', displayName: 'Test User', email: 'test@test.com', color: '#a8a4ff' },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

// Set JWT_SECRET for token generation
process.env.JWT_SECRET = 'test-secret-key';

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should return 409 if email already in use', async () => {
      User.findOne.mockResolvedValue({ email: 'existing@test.com' });
      const req = mockReq({
        body: { displayName: 'Test', email: 'existing@test.com', password: 'password123' },
      });
      const res = mockRes();

      await register(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'An account with this email already exists',
        })
      );
    });

    it('should create user and return 201 with token on success', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'new-user-id',
        displayName: 'New User',
        email: 'new@test.com',
        color: '#675df9',
      });

      const req = mockReq({
        body: { displayName: 'New User', email: 'new@test.com', password: 'password123' },
      });
      const res = mockRes();

      await register(req, res, mockNext);

      expect(User.create).toHaveBeenCalledWith({
        displayName: 'New User',
        email: 'new@test.com',
        password: 'password123',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              displayName: 'New User',
              email: 'new@test.com',
            }),
            token: expect.any(String),
          }),
        })
      );
    });

    it('should call next with error on unexpected failure', async () => {
      const dbError = new Error('DB connection failed');
      User.findOne.mockRejectedValue(dbError);

      const req = mockReq({
        body: { displayName: 'Test', email: 'test@test.com', password: 'password123' },
      });
      const res = mockRes();

      await register(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe('login', () => {
    it('should return 400 if email or password is missing', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();

      await login(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Please provide email and password',
        })
      );
    });

    it('should return 401 if user not found', async () => {
      User.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });
      const req = mockReq({
        body: { email: 'nonexistent@test.com', password: 'password123' },
      });
      const res = mockRes();

      await login(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid email or password',
        })
      );
    });

    it('should return 401 if password is wrong', async () => {
      User.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@test.com',
          displayName: 'Test',
          color: '#a8a4ff',
          comparePassword: vi.fn().mockResolvedValue(false),
        }),
      });

      const req = mockReq({
        body: { email: 'test@test.com', password: 'wrongpassword' },
      });
      const res = mockRes();

      await login(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 200 with token on successful login', async () => {
      User.findOne.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@test.com',
          displayName: 'Test User',
          color: '#a8a4ff',
          comparePassword: vi.fn().mockResolvedValue(true),
        }),
      });

      const req = mockReq({
        body: { email: 'test@test.com', password: 'correctpassword' },
      });
      const res = mockRes();

      await login(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            user: expect.objectContaining({
              displayName: 'Test User',
            }),
          }),
        })
      );
    });
  });

  describe('getMe', () => {
    it('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);
      const req = mockReq();
      const res = mockRes();

      await getMe(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return user profile on success', async () => {
      User.findById.mockResolvedValue({
        _id: 'user123',
        displayName: 'Test User',
        email: 'test@test.com',
        color: '#a8a4ff',
      });

      const req = mockReq();
      const res = mockRes();

      await getMe(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              displayName: 'Test User',
              email: 'test@test.com',
            }),
          }),
        })
      );
    });
  });
});
