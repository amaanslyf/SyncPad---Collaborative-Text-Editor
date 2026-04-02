import { useEffect, useState, useCallback } from 'react';
import { type WebsocketProvider } from 'y-websocket';
import { useAuth } from '../contexts/AuthContext';
import { createLogger } from '../utils/logger';

const log = createLogger('Presence');

export interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
  cursor?: { anchor: number; head: number } | null;
}

interface UsePresenceReturn {
  users: PresenceUser[];
  onlineCount: number;
}

export function usePresence(provider: WebsocketProvider | null): UsePresenceReturn {
  const { user } = useAuth();
  const [users, setUsers] = useState<PresenceUser[]>([]);

  // Set local awareness state
  useEffect(() => {
    if (!provider || !user) return;

    log.info(`Setting local awareness: ${user.displayName} (${user.color})`);
    provider.awareness.setLocalStateField('user', {
      name: user.displayName,
      color: user.color,
    });
  }, [provider, user]);

  // Track remote awareness states
  const handleAwarenessChange = useCallback(() => {
    if (!provider) return;

    const states = provider.awareness.getStates();
    const currentUsers: PresenceUser[] = [];

    states.forEach((state, clientId) => {
      if (state.user && clientId !== provider.awareness.clientID) {
        currentUsers.push({
          clientId,
          name: state.user.name || 'Anonymous',
          color: state.user.color || '#a8a4ff',
          cursor: state.cursor || null,
        });
      }
    });

    setUsers(currentUsers);
    log.debug(`Awareness update: ${currentUsers.length} remote user(s) online`);
  }, [provider]);

  useEffect(() => {
    if (!provider) return;

    provider.awareness.on('change', handleAwarenessChange);
    // Initial read
    handleAwarenessChange();

    return () => {
      provider.awareness.off('change', handleAwarenessChange);
    };
  }, [provider, handleAwarenessChange]);

  return {
    users,
    onlineCount: users.length + 1, // +1 for current user
  };
}
