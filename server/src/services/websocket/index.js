import { WebSocketServer } from 'ws';
import { createEncoder, toUint8Array, writeVarUint } from 'lib0/encoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import { createLogger } from '../../utils/logger.js';
import { roomManager } from './RoomManager.js';
import { handleMessage } from './MessageHandler.js';
import { authenticate, checkDocumentAccess } from './Auth.js';

const log = createLogger('WebSocketServer');

const messageSync = 0;
const messageAwareness = 1;

/**
 * Handle a new connection to a room
 */
const onConnection = async (conn, room) => {
  log.info(`${conn.user.displayName} connected to room: "${room.name}"`);
  
  room.addConnection(conn);

  // 1. Send sync step 1 (get current state)
  const encoder = createEncoder();
  writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  conn.send(toUint8Array(encoder));

  // 2. Send current awareness state (cursors, presence)
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = createEncoder();
    writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys()))
    );
    conn.send(toUint8Array(awarenessEncoder));
  }

  // 3. Setup event listeners
  conn.on('message', (message) => handleMessage(conn, room, message));
  
  conn.on('close', () => {
    log.info(`${conn.user.displayName} disconnected from room: "${room.name}"`);
    roomManager.handleClientClose(conn, room);
  });
  
  conn.on('error', (err) => {
    log.error(`WebSocket error for ${conn.user.displayName}:`, err.message);
    roomManager.handleClientClose(conn, room);
  });
};

/**
 * Main entry point to setup the WebSocket server
 */
export const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade to WebSocket
  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts[0] !== 'ws' || !pathParts[1]) {
      log.warn('WebSocket upgrade rejected — invalid path:', request.url);
      socket.destroy();
      return;
    }

    const documentId = pathParts[1];
    const token = url.searchParams.get('token');
    
    // Authenticate
    const user = await authenticate(token);
    if (!user) {
      log.warn('WebSocket upgrade rejected — authentication failed');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Access Check
    const hasAccess = await checkDocumentAccess(documentId, user.id);
    if (!hasAccess) {
      log.warn(`WebSocket upgrade rejected — access denied for user ${user.id} on doc ${documentId}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // Upgrade
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.user = user;
      ws.docName = documentId;
      wss.emit('connection', ws, request);
    });
  });

  // Connection established
  wss.on('connection', async (conn) => {
    const room = await roomManager.getRoom(conn.docName);
    onConnection(conn, room);
  });

  log.info('WebSocket system initialized modularly');
  return wss;
};

// Re-export methods for external usage (room cleanup, etc.)
export const disconnectUserFromDoc = roomManager.forceDisconnectUser.bind(roomManager);
export const destroyRoom = roomManager.destroyRoom.bind(roomManager);
export const flushAllDocuments = roomManager.flushAll.bind(roomManager);

export default { setupWebSocket, disconnectUserFromDoc, destroyRoom, flushAllDocuments };
