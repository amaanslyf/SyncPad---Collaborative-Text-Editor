import { useState, useEffect, useCallback } from 'react';
import { documentsApi, type RevisionMeta, ApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { useToast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { createLogger } from '../../utils/logger';
import type * as Y from 'yjs';
import './RevisionHistory.css';

const log = createLogger('RevisionPanel');

interface RevisionPanelProps {
  documentId: string;
  ydoc: Y.Doc;
  /** Called to get the current Yjs state as base64 */
  onGetSnapshot: () => string | null;
  /** Called to restore from a base64 snapshot */
  onRestoreSnapshot: (snapshot: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RevisionPanel({ documentId, ydoc, onGetSnapshot, onRestoreSnapshot }: RevisionPanelProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [revisions, setRevisions] = useState<RevisionMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const fetchRevisions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await documentsApi.getRevisions(token, documentId);
      setRevisions(res.data?.revisions || []);
    } catch (err) {
      console.error('Failed to fetch revisions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, documentId]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  // Listen for real-time revision updates via Yjs shared state
  useEffect(() => {
    if (!ydoc) return;
    const meta = ydoc.getMap('meta');
    const observeHandler = () => {
      log.debug('Revision update signaled via Yjs');
      fetchRevisions();
    };
    meta.observe(observeHandler);
    return () => meta.unobserve(observeHandler);
  }, [ydoc, fetchRevisions]);

  const handleSaveSnapshot = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const snapshot = onGetSnapshot();
      if (!snapshot) {
        showToast('No document state to save', 'warning');
        return;
      }
      await documentsApi.createRevision(token, documentId, {
        label: `Manual snapshot`,
        snapshot,
      });

      // Signal all connected clients to refresh their revision list
      const meta = ydoc.getMap('meta');
      meta.set('lastRevisionAt', Date.now());

      showToast('Snapshot saved!', 'success');
      fetchRevisions();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Failed to save snapshot',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRestore = async () => {
    if (!token || !restoreId) return;

    try {
      const res = await documentsApi.getRevisionSnapshot(token, documentId, restoreId);
      if (res.data?.snapshot) {
        onRestoreSnapshot(res.data.snapshot);
      }
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Failed to restore',
        'error'
      );
    } finally {
      setRestoreId(null);
    }
  };

  return (
    <div className="revision-panel">
      <div className="revision-panel__header">
        <span className="revision-panel__title">History</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSaveSnapshot} 
          isLoading={isSaving}
          data-tooltip="Save current version"
        >
          📸 Save
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
          <Spinner size="sm" />
        </div>
      ) : revisions.length === 0 ? (
        <div className="revision-empty">
          No revisions yet. Save a snapshot to track versions.
        </div>
      ) : (
        <div className="revision-list">
          {revisions.map((rev) => (
            <div key={rev.id} className="revision-item">
              <div className="revision-item__info">
                <div className="revision-item__label">{rev.label}</div>
                <div className="revision-item__meta">
                  {rev.createdByName} · {formatDate(rev.createdAt)}
                </div>
              </div>
              <div className="revision-item__action">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setRestoreId(rev.id)}
                  data-tooltip="Restore this version"
                  aria-label="Restore this version"
                >
                  ↩
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={confirmRestore}
        title="Restore Version"
        message="Are you sure you want to restore this version? Your current document content will be replaced."
        confirmText="Restore"
      />
    </div>
  );
}
