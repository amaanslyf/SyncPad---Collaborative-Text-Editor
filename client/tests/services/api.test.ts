import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../../src/services/api';

// Create a mock fetch implementation
const mockFetch = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.fetch = mockFetch as any;

describe('API Services', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('apiRequest wrapper', () => {
    it('should correctly format a GET request with auth token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { test: 'ok' } }),
      });

      // We'll test this through the documents API which uses apiRequest under the hood
      await api.documentsApi.list('test-token-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const args = mockFetch.mock.calls[0];
      // Check URL and token
      expect(args[0]).toContain('/documents');
      expect(args[1].headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123',
      });
    });

    it('should properly format POST requests with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { document: { id: 'new' } } }),
      });

      await api.documentsApi.create('test-token', 'My Title');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const args = mockFetch.mock.calls[0];
      expect(args[1].method).toBe('POST');
      expect(JSON.parse(args[1].body)).toEqual({ title: 'My Title' });
    });

    it('should throw ApiError on non-ok responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Unauthorized' }),
      });

      await expect(api.documentsApi.list('bad-token')).rejects.toThrow(api.ApiError);
      await expect(api.documentsApi.list('bad-token')).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors gracefully by throwing generic ApiError', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(api.documentsApi.list('token')).rejects.toThrow(api.ApiError);
      await expect(api.documentsApi.list('token')).rejects.toThrow('Network error. Please check your connection.');
    });
  });

  describe('authApi', () => {
    it('login sends correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.authApi.login({ email: 'test@example.com', password: 'password' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const args = mockFetch.mock.calls[0];
      expect(args[1].method).toBe('POST');
      expect(JSON.parse(args[1].body)).toEqual({ email: 'test@example.com', password: 'password' });
    });
  });
});
