import { useState } from 'react';
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
import { useDocumentMetadata } from '../hooks/document/useDocumentMetadata';
import { useDocumentRevision } from '../hooks/document/useDocumentRevision';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Initialize collaboration
  const { ydoc, provider, isConnected, isSynced } = useCollaboration({
    documentId: id || '',
  });

  // Manage document metadata (fetching + title auto-sync)
  const {
    docTitle,
    setDocTitle,
    docNotFound,
    accessDenied,
    docIsPublic,
    docOwnerId,
    isLoading,
  } = useDocumentMetadata({ id, token });

  // Track user presence
  const { users } = usePresence(provider);

  // Manage revisions and snapshots
  const {
    handleGetSnapshot,
    handleRestoreSnapshot,
  } = useDocumentRevision({ editor });


  if (isLoading && !docNotFound && !accessDenied) {
    return <FullPageSpinner />;
  }

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
            title={docTitle}
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
