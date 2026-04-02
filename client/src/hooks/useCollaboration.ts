import { useEffect, useMemo, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuth } from '../contexts/AuthContext';
import { createLogger } from '../utils/logger';

const log = createLogger('Collaboration');

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

interface UseCollaborationOptions {
  documentId: string;
}

interface UseCollaborationReturn {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  isSynced: boolean;
}

export function useCollaboration({ documentId }: UseCollaborationOptions): UseCollaborationReturn {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const providerRef = useRef<WebsocketProvider | null>(null);

  // Create Yjs document — stable across renders
  const ydoc = useMemo(() => new Y.Doc(), []);

  useEffect(() => {
    if (!token || !documentId) return;

    log.info(`Connecting to document: ${documentId}`);

    // Connect to WebSocket with auth token in URL params
    const wsUrl = `${WS_URL}/ws/${documentId}`;
    const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
      params: { token },
      connect: true,
      // Reconnect with backoff
      maxBackoffTime: 10000,
    });

    providerRef.current = provider;

    // Connection status tracking
    provider.on('status', (event: { status: string }) => {
      const connected = event.status === 'connected';
      setIsConnected(connected);
      if (connected) {
        log.info(`WebSocket connected to document: ${documentId}`);
      } else {
        log.warn(`WebSocket disconnected from document: ${documentId} — status: ${event.status}`);
      }
    });

    provider.on('sync', (synced: boolean) => {
      setIsSynced(synced);
      if (synced) {
        log.info(`Document synced: ${documentId}`);
      }
    });

    provider.on('connection-error', (event: Event) => {
      log.error(`WebSocket connection error for document ${documentId}:`, event);
    });

    return () => {
      log.info(`Disconnecting from document: ${documentId}`);
      provider.disconnect();
      provider.destroy();
      providerRef.current = null;
      setIsConnected(false);
      setIsSynced(false);
    };
  }, [documentId, token, ydoc]);

  return {
    ydoc,
    provider: providerRef.current,
    isConnected,
    isSynced,
  };
}
