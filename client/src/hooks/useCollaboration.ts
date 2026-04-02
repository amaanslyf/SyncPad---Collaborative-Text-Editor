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
      connect: false, // Initialize without connecting to attach listeners first
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
      if (synced) {
        setIsSynced(true);
        log.info(`Document synced: ${documentId}`);
      }
    });

    provider.on('connection-error', (event: Event) => {
      log.error(`WebSocket connection error for document ${documentId}:`, event);
    });

    // START CONNECTION explicitly after listeners are attached
    provider.connect();

    // SAFETY CHECKS:
    // 1. Immediate sync check (if already synced from cache or super-fast response)
    if (provider.synced) {
      log.debug(`Document already synced on connect: ${documentId}`);
      setIsSynced(true);
    }

    // 2. Fallback timeout to prevent permanent "Syncing..." hang
    const syncFallback = setTimeout(() => {
      if (!provider.synced && provider.wsconnected) {
        log.warn(`Sync taking too long for ${documentId} — force revealing editor`);
        setIsSynced(true);
      }
    }, 4000);

    return () => {
      log.info(`Disconnecting from document: ${documentId}`);
      clearTimeout(syncFallback);
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
