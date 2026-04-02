import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { getPersistence } from './persistence.js';
import { authenticateWS } from '../middleware/auth.js';
import Document from '../models/Document.js';
import { createLogger } from '../utils/logger.js';

// Dependencies for Yjs WebSocket protocol
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { createEncoder, toUint8Array, writeVarUint } from 'lib0/encoding';

const log = createLogger('WebSocket');

const messageSync = 0;
const messageAwareness = 1;

/**
 * In-memory store for active document rooms
 * Each room holds a Y.Doc instance and connected clients
 */
const docs = new Map();

/**
 * Get or create a Yjs document room
 */
const getYDoc = async (docName) => {
  if (docs.has(docName)) {
    log.debug(`Room "${docName}" found in memory (${docs.get(docName).conns.size} connections)`);
    return docs.get(docName);
  }

  log.info(`Creating new room: "${docName}"`);

  const doc = new Y.Doc();
  doc.name = docName;
  doc.conns = new Map(); // ws -> Set<number> (awareness client ids)
  doc.awareness = new awarenessProtocol.Awareness(doc);

  // Load persisted state from MongoDB
  try {
    const mdb = getPersistence();
    const persistedDoc = await mdb.getYDoc(docName);
    const persistedState = Y.encodeStateAsUpdate(persistedDoc);
    Y.applyUpdate(doc, persistedState);
    persistedDoc.destroy();
    log.info(`Loaded persisted state for room: "${docName}"`);
  } catch (err) {
    log.warn(`Could not load persisted state for "${docName}":`, {
      message: err.message,
      code: err.code,
    });
  }

  // Listen for updates and persist them
  doc.on('update', async (update, _origin) => {
    try {
      const mdb = getPersistence();
      await mdb.storeUpdate(docName, update);
    } catch (err) {
      log.error(`Failed to persist update for "${docName}":`, {
        message: err.message,
        updateSize: update.length,
      });
    }

    // Broadcast update to all connected clients
    const encoder = createEncoder();
    writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = toUint8Array(encoder);

    let broadcastCount = 0;
    doc.conns.forEach((_awarenessIds, conn) => {
      if (conn.readyState === conn.OPEN) {
        try {
          conn.send(message);
          broadcastCount++;
        } catch (sendErr) {
          log.warn(`Failed to send update to client in room "${docName}":`, sendErr.message);
        }
      }
    });
    log.debug(`Broadcast update to ${broadcastCount}/${doc.conns.size} clients in "${docName}"`);
  });

  // Handle awareness updates
  doc.awareness.on('update', ({ added, updated, removed }) => {
    const changedClients = added.concat(updated).concat(removed);
    const encoder = createEncoder();
    writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, changedClients)
    );
    const message = toUint8Array(encoder);

    doc.conns.forEach((_awarenessIds, conn) => {
      if (conn.readyState === conn.OPEN) {
        try {
          conn.send(message);
        } catch {
          // Connection may have closed
        }
      }
    });
  });

  docs.set(docName, doc);
  return doc;
};

/**
 * Handle incoming WebSocket messages
 */
const handleMessage = (conn, doc, message) => {
  try {
    const decoder = decoding.createDecoder(new Uint8Array(message));
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        const encoder = createEncoder();
        writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        const reply = toUint8Array(encoder);
        if (reply.length > 1) {
          conn.send(reply);
        }
        break;
      }
      case messageAwareness: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, update, conn);
        break;
      }
      default:
        log.warn(`Unknown message type received: ${messageType} in room "${doc.name}"`);
    }
  } catch (err) {
    log.error(`Error handling message in room "${doc.name}":`, {
      message: err.message,
      user: conn.user?.displayName,
    });
  }
};

/**
 * Clean up when a client disconnects
 */
const handleClose = (conn, doc) => {
  const awarenessIds = doc.conns.get(conn);
  doc.conns.delete(conn);

  if (awarenessIds) {
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(awarenessIds), null);
  }

  log.info(`Room "${doc.name}" now has ${doc.conns.size} connection(s)`);

  // If no more connections, keep doc in memory for a bit then clean up
  if (doc.conns.size === 0) {
    log.info(`Room "${doc.name}" is empty — scheduling cleanup in 30s`);
    setTimeout(() => {
      if (doc.conns.size === 0) {
        doc.destroy();
        docs.delete(doc.name);
        log.info(`Room "${doc.name}" destroyed (idle timeout)`);
      } else {
        log.debug(`Room "${doc.name}" cleanup cancelled — clients reconnected`);
      }
    }, 30000); // 30 second grace period
  }
};

/**
 * Check if a user has access to a document for WebSocket connections.
 * Returns true if access is granted, false otherwise.
 */
const checkDocumentAccess = async (documentId, userId) => {
  try {
    const document = await Document.findById(documentId).lean();
    if (!document) {
      log.warn(`WS access check: document not found: ${documentId}`);
      return false;
    }

    // Public documents are accessible to all authenticated users
    if (document.isPublic) {
      return true;
    }

    // Private documents: check owner or collaborator
    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(
      (c) => c.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      log.warn(`WS access denied: user ${userId} is not owner/collaborator of doc ${documentId}`);
      return false;
    }

    return true;
  } catch (err) {
    log.error(`WS access check error for doc ${documentId}:`, { message: err.message });
    return false;
  }
};

/**
 * Disconnect a specific user from a document room.
 * Used when a collaborator is removed while actively editing.
 */
export const disconnectUserFromDoc = (documentId, userId) => {
  const doc = docs.get(documentId);
  if (!doc) return;

  doc.conns.forEach((_awarenessIds, conn) => {
    if (conn.user && conn.user.id === userId) {
      log.info(`Force-disconnecting user ${conn.user.displayName} from room "${documentId}" (access revoked)`);
      try {
        // Send a close frame with code 4403 (custom) + reason
        conn.close(4403, 'Access revoked');
      } catch {
        conn.terminate();
      }
    }
  });
};

/**
 * Set up the WebSocket server on an existing HTTP server
 */
export const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade to WebSocket
  server.on('upgrade', async (request, socket, head) => {
    // Extract room name from URL path: /ws/:documentId
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts[0] !== 'ws' || !pathParts[1]) {
      log.warn('WebSocket upgrade rejected — invalid path:', request.url);
      socket.destroy();
      return;
    }

    const documentId = pathParts[1];

    // Authenticate via query param token
    const token = url.searchParams.get('token');
    const user = await authenticateWS(token);

    if (!user) {
      log.warn('WebSocket upgrade rejected — authentication failed');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Check document access for private documents
    const hasAccess = await checkDocumentAccess(documentId, user.id);
    if (!hasAccess) {
      log.warn(`WebSocket upgrade rejected — access denied for user ${user.displayName} on doc ${documentId}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.user = user;
      ws.docName = documentId;
      wss.emit('connection', ws, request);
    });
  });

  // Handle new WebSocket connections
  wss.on('connection', async (conn) => {
    const docName = conn.docName;
    const user = conn.user;

    log.info(`${user.displayName} connected to room: "${docName}"`);

    const doc = await getYDoc(docName);
    doc.conns.set(conn, new Set());

    // Send sync step 1
    const encoder = createEncoder();
    writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    conn.send(toUint8Array(encoder));

    // Send current awareness state
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = createEncoder();
      writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
      );
      conn.send(toUint8Array(awarenessEncoder));
    }

    conn.on('message', (message) => handleMessage(conn, doc, message));
    conn.on('close', () => {
      log.info(`${user.displayName} disconnected from room: "${docName}"`);
      handleClose(conn, doc);
    });
    conn.on('error', (err) => {
      log.error(`WebSocket error for ${user.displayName} in room "${docName}":`, {
        message: err.message,
        code: err.code,
      });
      handleClose(conn, doc);
    });
  });

  log.info('WebSocket server initialized');
  return wss;
};

export default { setupWebSocket, disconnectUserFromDoc };
