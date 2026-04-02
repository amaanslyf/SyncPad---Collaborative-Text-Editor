import { useState, useCallback } from 'react';
import { documentsApi, type DocumentMeta, ApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { createLogger } from '../utils/logger';

const log = createLogger('Documents');

export function useDocuments() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    log.info('Fetching documents...');
    try {
      const response = await documentsApi.list(token);
      const docs = response.data?.documents || [];
      setDocuments(docs);
      log.info(`Loaded ${docs.length} documents`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load documents';
      log.error('Failed to fetch documents:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const createDocument = useCallback(
    async (title?: string) => {
      if (!token) return null;
      setError(null);
      log.info(`Creating document: "${title || 'Untitled Document'}"`);
      try {
        const response = await documentsApi.create(token, title);
        const newDoc = response.data?.document;
        if (newDoc) {
          setDocuments((prev) => [newDoc, ...prev]);
          log.info(`Document created: "${newDoc.title}" (${newDoc._id})`);
        }
        return newDoc || null;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to create document';
        log.error('Document creation failed:', message);
        throw err;
      }
    },
    [token]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!token) return;
      setError(null);
      log.info(`Deleting document: ${id}`);
      try {
        await documentsApi.delete(token, id);
        setDocuments((prev) => prev.filter((d) => d._id !== id));
        log.info(`Document deleted: ${id}`);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to delete document';
        log.error(`Document deletion failed for ${id}:`, message);
        throw err;
      }
    },
    [token]
  );

  const updateTitle = useCallback(
    async (id: string, title: string) => {
      if (!token) return;
      log.debug(`Updating document title: ${id} → "${title}"`);
      try {
        await documentsApi.update(token, id, { title });
        setDocuments((prev) =>
          prev.map((d) => (d._id === id ? { ...d, title } : d))
        );
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to update title';
        log.error(`Title update failed for ${id}:`, message);
        throw err;
      }
    },
    [token]
  );

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    createDocument,
    deleteDocument,
    updateTitle,
  };
}
