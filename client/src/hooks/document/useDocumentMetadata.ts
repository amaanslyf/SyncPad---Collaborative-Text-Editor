import { useState, useEffect } from 'react';
import { documentsApi, ApiError } from '../../services/api';
import { createLogger } from '../../utils/logger';

const log = createLogger('useDocumentMetadata');

interface UseDocumentMetadataOptions {
  id: string | undefined;
  token: string | null;
}

export function useDocumentMetadata({ id, token }: UseDocumentMetadataOptions) {
  const [docTitle, setDocTitle] = useState('');
  const [docNotFound, setDocNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [docIsPublic, setDocIsPublic] = useState(true);
  const [docOwnerId, setDocOwnerId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch document metadata
  useEffect(() => {
    const fetchDoc = async () => {
      if (!token || !id) return;
      try {
        setIsLoading(true);
        const res = await documentsApi.get(token, id);
        if (res.data?.document) {
          setDocTitle(res.data.document.title);
          setDocIsPublic(res.data.document.isPublic);
          setDocOwnerId(res.data.document.owner?._id || '');
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setDocNotFound(true);
          } else if (err.status === 403) {
            setAccessDenied(true);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoc();
  }, [token, id]);

  // Debounced title update
  useEffect(() => {
    if (!token || !id || !docTitle) return;
    const timeout = setTimeout(async () => {
      try {
        await documentsApi.update(token, id, { title: docTitle });
      } catch (err) {
        log.warn('Failed to update document title:', err);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [docTitle, token, id]);

  return {
    docTitle,
    setDocTitle,
    docNotFound,
    accessDenied,
    docIsPublic,
    docOwnerId,
    isLoading,
  };
}
