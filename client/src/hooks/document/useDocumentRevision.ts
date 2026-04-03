import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useToast } from '../../components/common/Toast';

interface UseDocumentRevisionOptions {
  editor: Editor | null;
}

export function useDocumentRevision({ editor }: UseDocumentRevisionOptions) {
  const { showToast } = useToast();

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

  return {
    handleGetSnapshot,
    handleRestoreSnapshot,
  };
}
