import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/models/Document.js', () => {
  return {
    default: {
      find: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findByIdAndDelete: vi.fn(),
    },
  };
});

vi.mock('../../src/utils/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import Document from '../../src/models/Document.js';
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  createRevision,
} from '../../src/controllers/documentController.js';

// Test helpers
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

describe('Document Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('should return all accessible documents', async () => {
      const mockDocs = [
        { _id: 'doc1', title: 'Doc 1' },
        { _id: 'doc2', title: 'Doc 2' },
      ];

      Document.find.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDocs),
      });

      const req = mockReq();
      const res = mockRes();

      await listDocuments(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { documents: mockDocs },
        })
      );
    });

    it('should call next with error on failure', async () => {
      const error = new Error('DB error');
      Document.find.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockRejectedValue(error),
      });

      const req = mockReq();
      const res = mockRes();

      await listDocuments(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createDocument', () => {
    it('should create document with default title', async () => {
      const mockDoc = {
        _id: 'newdoc',
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

    it('should create document with custom title', async () => {
      const mockDoc = {
        _id: 'newdoc',
        title: 'My Custom Doc',
        owner: 'user123',
        populate: vi.fn().mockResolvedValue(true),
      };
      Document.create.mockResolvedValue(mockDoc);

      const req = mockReq({ body: { title: 'My Custom Doc' } });
      const res = mockRes();

      await createDocument(req, res, mockNext);

      expect(Document.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Custom Doc' })
      );
    });
  });

  describe('getDocument', () => {
    it('should return 404 if document not found', async () => {
      Document.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(null),
      });

      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();

      await getDocument(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return document on success', async () => {
      const mockDoc = { _id: 'doc123', title: 'Test' };
      Document.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(mockDoc),
      });

      const req = mockReq({ params: { id: 'doc123' } });
      const res = mockRes();

      await getDocument(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { document: mockDoc },
        })
      );
    });
  });

  describe('updateDocument', () => {
    it('should return 404 if document not found', async () => {
      Document.findById.mockResolvedValue(null);

      const req = mockReq({ params: { id: 'nonexistent' }, body: { title: 'New Title' } });
      const res = mockRes();

      await updateDocument(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should update document title', async () => {
      const mockDoc = {
        _id: 'doc123',
        title: 'Old Title',
        owner: 'user123',
        save: vi.fn().mockResolvedValue(true),
        populate: vi.fn().mockResolvedValue(true),
      };
      Document.findById.mockResolvedValue(mockDoc);

      const req = mockReq({ params: { id: 'doc123' }, body: { title: 'New Title' } });
      const res = mockRes();

      await updateDocument(req, res, mockNext);

      expect(mockDoc.title).toBe('New Title');
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('should return 404 if document not found', async () => {
      Document.findById.mockResolvedValue(null);

      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();

      await deleteDocument(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if user is not the owner', async () => {
      Document.findById.mockResolvedValue({
        _id: 'doc123',
        owner: { toString: () => 'other-user-id' },
      });

      const req = mockReq({ params: { id: 'doc123' } });
      const res = mockRes();

      await deleteDocument(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should delete document if user is owner', async () => {
      Document.findById.mockResolvedValue({
        _id: 'doc123',
        title: 'My Doc',
        owner: { toString: () => 'user123' },
      });
      Document.findByIdAndDelete.mockResolvedValue(true);

      const req = mockReq({ params: { id: 'doc123' } });
      const res = mockRes();

      await deleteDocument(req, res, mockNext);

      expect(Document.findByIdAndDelete).toHaveBeenCalledWith('doc123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Document deleted successfully',
        })
      );
    });
  });

  describe('createRevision', () => {
    it('should return 400 if no snapshot data provided', async () => {
      Document.findById.mockResolvedValue({ _id: 'doc123' });

      const req = mockReq({ params: { id: 'doc123' }, body: { label: 'test' } });
      const res = mockRes();

      await createRevision(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create revision with snapshot', async () => {
      const mockDoc = {
        _id: 'doc123',
        title: 'Test',
        revisions: [],
        save: vi.fn().mockResolvedValue(true),
      };
      Document.findById.mockResolvedValue(mockDoc);

      const req = mockReq({
        params: { id: 'doc123' },
        body: { label: 'My Snapshot', snapshot: 'dGVzdA==' },
      });
      const res = mockRes();

      await createRevision(req, res, mockNext);

      expect(mockDoc.revisions.length).toBe(1);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
