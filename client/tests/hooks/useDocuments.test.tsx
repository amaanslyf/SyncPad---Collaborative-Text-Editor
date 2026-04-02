import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDocuments } from '../../src/hooks/useDocuments';
import { documentsApi } from '../../src/services/api';

// Mock the documents API
vi.mock('../../src/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/api')>();
  return {
    ...actual,
    documentsApi: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
});

// Mock the Auth hook
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'fake-jwt-token',
  }),
}));

describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch documents on call and set state', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDocs = [{ _id: 'doc1', title: 'Test Doc' }, { _id: 'doc2', title: 'Another Doc' }] as any;
    vi.mocked(documentsApi.list).mockResolvedValue({ success: true, data: { documents: mockDocs } });

    const { result } = renderHook(() => useDocuments());

    // Initially empty
    expect(result.current.documents).toEqual([]);

    // Call fetchDocuments
    await act(async () => {
      await result.current.fetchDocuments();
    });

    await waitFor(() => {
      expect(result.current.documents).toEqual(mockDocs);
    });
    expect(documentsApi.list).toHaveBeenCalledWith('fake-jwt-token');
  });

  it('should handle API errors appropriately during fetch', async () => {
    vi.mocked(documentsApi.list).mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.fetchDocuments();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load documents');
      expect(result.current.documents).toEqual([]);
    });
  });

  it('should add newly created document to the state', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newDoc = { _id: 'new123', title: 'New Doc' } as any;
    vi.mocked(documentsApi.create).mockResolvedValue({ success: true, data: { document: newDoc } });

    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.createDocument('New Doc');
    });

    await waitFor(() => {
      expect(result.current.documents).toContainEqual(newDoc);
    });
    expect(documentsApi.create).toHaveBeenCalledWith('fake-jwt-token', 'New Doc');
  });

  it('should remove deleted document from state', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialDocs = [{ _id: 'todelete', title: 'Doc' }, { _id: 'keep', title: 'Keep' }] as any;
    vi.mocked(documentsApi.list).mockResolvedValue({ success: true, data: { documents: initialDocs } });
    vi.mocked(documentsApi.delete).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.fetchDocuments();
    });

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(2);
    });

    await act(async () => {
      await result.current.deleteDocument('todelete');
    });

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(1);
      expect(result.current.documents[0]._id).toBe('keep');
    });
  });
});
