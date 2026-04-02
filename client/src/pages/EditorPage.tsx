import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Y from 'yjs';
import { Layout } from '../components/Layout/Layout';
import { Header } from '../components/Layout/Header';
import { CollaborativeEditor } from '../components/Editor/CollaborativeEditor';
import { UserPresence } from '../components/Presence/UserPresence';
import { RevisionPanel } from '../components/RevisionHistory/RevisionPanel';
import { FullPageSpinner } from '../components/common/Spinner';
import { Button } from '../components/common/Button';
import { useCollaboration } from '../hooks/useCollaboration';
import { usePresence } from '../hooks/usePresence';
import { useAuth } from '../contexts/AuthContext';
import { documentsApi, ApiError } from '../services/api';
import { useToast } from '../components/common/Toast';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [docTitle, setDocTitle] = useState('');
  const [docNotFound, setDocNotFound] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize collaboration
  const { ydoc, provider, isConnected, isSynced } = useCollaboration({
    documentId: id || '',
  });

  // Track user presence
  const { users } = usePresence(provider);

  // Fetch document metadata
  useEffect(() => {
    const fetchDoc = async () => {
      if (!token || !id) return;
      try {
        const res = await documentsApi.get(token, id);
        if (res.data?.document) {
          setDocTitle(res.data.document.title);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setDocNotFound(true);
        }
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
      } catch {
        // Silently fail title updates
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [docTitle, token, id]);

  // Get Yjs state as base64 for revision snapshots
  const handleGetSnapshot = useCallback((): string | null => {
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      // Convert Uint8Array to base64
      let binary = '';
      const bytes = new Uint8Array(state);
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      return btoa(binary);
    } catch {
      return null;
    }
  }, [ydoc]);

  // Restore Yjs state from base64 snapshot
  const handleRestoreSnapshot = useCallback(
    (snapshotBase64: string) => {
      try {
        const binary = atob(snapshotBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        Y.applyUpdate(ydoc, bytes);
        showToast('Document restored from snapshot', 'success');
      } catch {
        showToast('Failed to restore snapshot', 'error');
      }
    },
    [ydoc, showToast]
  );

  if (docNotFound) {
    return (
      <Layout>
        <Header />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 'var(--spacing-4)',
          padding: 'var(--spacing-8)',
        }}>
          <h2 style={{ color: 'var(--color-on-surface)', fontSize: 'var(--font-size-2xl)' }}>
            Document not found
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>
            This document may have been deleted or doesn't exist.
          </p>
          <Button onClick={() => navigate('/')}>Go to Documents</Button>
        </div>
      </Layout>
    );
  }

  if (!id) {
    return <FullPageSpinner />;
  }

  return (
    <Layout>
      <Header
        docTitle={docTitle}
        onTitleChange={setDocTitle}
        isConnected={isConnected}
        showBack
      />
      <div className="editor-page">
        <div className="editor-page__main">
          <CollaborativeEditor
            ydoc={ydoc}
            provider={provider}
            isConnected={isConnected}
            isSynced={isSynced}
          />
        </div>
        <aside className={`editor-page__sidebar ${!sidebarOpen ? 'editor-page__sidebar--collapsed' : ''}`}>
          <UserPresence users={users} variant="full" />
          <RevisionPanel
            documentId={id}
            onGetSnapshot={handleGetSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
          />
          <div style={{ padding: 'var(--spacing-4)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              style={{ width: '100%' }}
            >
              Hide Sidebar
            </Button>
          </div>
        </aside>
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'fixed',
              right: 'var(--spacing-4)',
              top: '50%',
              zIndex: 100,
            }}
            aria-label="Show sidebar"
            data-tooltip="Show sidebar"
          >
            ☰
          </Button>
        )}
      </div>
    </Layout>
  );
}
