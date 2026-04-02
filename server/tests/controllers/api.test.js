import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mongoose and models
vi.mock('../../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../src/models/Document.js', () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

// Import after mocks
import User from '../../src/models/User.js';
import Document from '../../src/models/Document.js';
import { register, login } from '../../src/controllers/authController.js';
import { createDocument } from '../../src/controllers/documentController.js';

// Helper to create mock req/res
const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { id: 'user123', displayName: 'Test User', color: '#a8a4ff' },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('returns 409 if email already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'test@test.com' });
      const req = mockReq({ body: { email: 'test@test.com', password: '123456', displayName: 'Test' } });
      const res = mockRes();

      await register(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('login', () => {
    it('returns 400 if email or password missing', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();

      await login(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 if user not found', async () => {
      User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
      const req = mockReq({ body: { email: 'no@user.com', password: '123456' } });
      const res = mockRes();

      await login(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});

describe('Document Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDocument', () => {
    it('creates a document with default title', async () => {
      const mockDoc = {
        _id: 'doc123',
        title: 'Untitled Document',
        owner: 'user123',
        populate: vi.fn().mockResolvedValue(true),
      };
      Document.create.mockResolvedValue(mockDoc);

      const req = mockReq({ body: {} });
      const res = mockRes();

      await createDocument(req, res, mockNext);

      expect(Document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled Document',
          owner: 'user123',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
