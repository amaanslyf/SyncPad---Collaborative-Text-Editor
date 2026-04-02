import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { type WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';
import { useAuth } from '../../contexts/AuthContext';
import { EditorToolbar } from './EditorToolbar';
import { Spinner } from '../common/Spinner';
import './Editor.css';

interface CollaborativeEditorProps {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  isSynced: boolean;
}

export function CollaborativeEditor({
  ydoc,
  provider,
  isConnected,
  isSynced,
}: CollaborativeEditorProps) {
  const { user } = useAuth();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Collaboration handles its own undo/redo
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing... Your changes sync instantly with collaborators.',
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider,
              user: {
                name: user?.displayName || 'Anonymous',
                color: user?.color || '#a8a4ff',
              },
            }),
          ]
        : []),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap',
        spellcheck: 'true',
      },
    },
  }, [ydoc, provider]);

  if (!isSynced) {
    return (
      <div className="editor-loading">
        <Spinner size="lg" />
        <span>Syncing document...</span>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <EditorToolbar editor={editor} />
      <div className="tiptap-wrapper">
        <EditorContent editor={editor} />
      </div>
      {!isConnected && (
        <div
          style={{
            position: 'fixed',
            bottom: 'var(--spacing-4)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-error-dim)',
            color: '#fff',
            padding: 'var(--spacing-2) var(--spacing-4)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--font-size-sm)',
            zIndex: 'var(--z-toast)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          Connection lost. Reconnecting...
        </div>
      )}
    </div>
  );
}
