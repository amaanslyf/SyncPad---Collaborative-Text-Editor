import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import { Layout } from '../components/Layout/Layout';
import { Header } from '../components/Layout/Header';
import { CollaborativeEditor } from '../components/Editor/CollaborativeEditor';
import { UserPresence } from '../components/Presence/UserPresence';
import { RevisionPanel } from '../components/RevisionHistory/RevisionPanel';
import { CollaboratorPanel } from '../components/Documents/CollaboratorPanel';
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
  const [accessDenied, setAccessDenied] = useState(false);
  const [docIsPublic, setDocIsPublic] = useState(true);
  const [docOwnerId, setDocOwnerId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);

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

  // Get editor state as JSON string (base64 encoded) for revision snapshots
  const handleGetSnapshot = useCallback((): string | null => {
    if (!editor) return null;
    try {
      const jsonStr = JSON.stringify(editor.getJSON());
      // API expects base64 string because it previously stored binary Yjs states
      return btoa(unescape(encodeURIComponent(jsonStr)));
    } catch {
      return null;
    }
  }, [editor]);

  // Restore document from JSON snapshot (base64 encoded)
  const handleRestoreSnapshot = useCallback(
    (snapshotStr: string) => {
      if (!editor) return;
      try {
        let content;
        try {
          const jsonStr = decodeURIComponent(escape(atob(snapshotStr)));
          content = JSON.parse(jsonStr);
        } catch {
          throw new Error('Incompatible snapshot format. Only new snapshots can be restored.');
        }

        // Tiptap handles the transaction and Yjs translation automatically!
        editor.commands.setContent(content);
        showToast('Document restored from snapshot', 'success');
      } catch (err) {
        console.error('Failed to restore snapshot:', err);
        showToast(err instanceof Error ? err.message : 'Failed to restore snapshot', 'error');
      }
    },
    [editor, showToast]
  );

  // Access denied state
  if (accessDenied) {
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
          <div style={{ fontSize: '3rem', opacity: 0.6 }}>🔒</div>
          <h2 style={{ color: 'var(--color-on-surface)', fontSize: 'var(--font-size-2xl)' }}>
            Access Denied
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', textAlign: 'center', maxWidth: '400px' }}>
            You don't have permission to view this document.
            Ask the document owner to invite you by sharing your email.
          </p>
          <Button onClick={() => navigate('/')}>Go to Documents</Button>
        </div>
      </Layout>
    );
  }

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
            onEditorReady={setEditor}
          />
        </div>
        <aside className={`editor-page__sidebar ${!sidebarOpen ? 'editor-page__sidebar--collapsed' : ''}`}>
          <UserPresence users={users} variant="full" />
          <CollaboratorPanel
            documentId={id}
            isPublic={docIsPublic}
            ownerId={docOwnerId}
          />
          <RevisionPanel
            documentId={id}
            ydoc={ydoc}
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
