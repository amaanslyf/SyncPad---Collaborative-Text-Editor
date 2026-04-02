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

  // Re-implementing manual persistence as bindState is not available
  try {
    const mdb = getPersistence();
    const persistedDoc = await mdb.getYDoc(docName);
    
    // Check if the persisted doc actually has data
    const state = Y.encodeStateAsUpdate(persistedDoc);
    if (state.length > 2) { // 2-3 bytes is usually an empty state vector
      Y.applyUpdate(doc, state);
      log.info(`✅ Loaded persisted state for room: "${docName}" (${state.length} bytes)`);
    } else {
      log.info(`ℹ️ New or empty document state for room: "${docName}"`);
    }
    persistedDoc.destroy();
  } catch (err) {
    log.error(`❌ Failed to load persisted state for room "${docName}":`, err.message);
  }

  // Listen for updates and persist them manually
  doc.on('update', async (update, origin) => {
    // If update originated from this local provider (not from MongoDB itself)
    // we don't strictly need the origin check here because we are doing manual sync,
    // but we add it for safety.
    
    try {
      const mdb = getPersistence();
      // 1. Immediately store the small incremental update to MongoDB buffer
      await mdb.storeUpdate(docName, update);
      
      // 2. Schedule a debounced flush to merge/compact updates in DB
      if (doc.flushTimer) clearTimeout(doc.flushTimer);
      doc.flushTimer = setTimeout(async () => {
        try {
          await mdb.flushDocument(docName);
          log.debug(`✅ Debounced flush complete for room: "${docName}"`);
        } catch (flushErr) {
          log.error(`❌ Failed to flush document "${docName}":`, flushErr.message);
        }
      }, 2000); // 2s idle timer
      
    } catch (persistErr) {
      log.error(`❌ Failed to persist update for "${docName}":`, persistErr.message);
    }

    // Broadcast update to all connected clients
    const encoder = createEncoder();
    writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = toUint8Array(encoder);

    let broadcastCount = 0;
    doc.conns.forEach((_awarenessIds, conn) => {
      // Don't send update back to the source connection
      if (conn !== origin && conn.readyState === conn.OPEN) {
        try {
          conn.send(message);
          broadcastCount++;
        } catch (sendErr) {
          log.warn(`Failed to send update in room "${docName}":`, sendErr.message);
        }
      }
    });

    if (broadcastCount > 0) {
      log.debug(`Broadcasting update in "${docName}" to ${broadcastCount} clients`);
    }
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
    log.info(`Room "${doc.name}" is empty — scheduling final flush and cleanup in 30s`);
    setTimeout(async () => {
      if (doc.conns.size === 0) {
        try {
          const mdb = getPersistence();
          // Final flush before memory destruction
          await mdb.flushDocument(doc.name);
          log.info(`Final flush complete for room "${doc.name}"`);
        } catch (err) {
          log.warn(`Final flush failed for rooms "${doc.name}": ${err.message}`);
        }

        if (doc.flushTimer) {
          clearTimeout(doc.flushTimer);
          doc.flushTimer = null;
        }
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
 * Force-destroy a document room in memory.
 * Used when a document is deleted to ensure no "ghost" flushes happen.
 */
export const destroyRoom = (docId) => {
  const doc = docs.get(docId);
  if (!doc) return;

  log.info(`Force-destroying room "${docId}" (document deleted)`);
  
  if (doc.flushTimer) {
    clearTimeout(doc.flushTimer);
    doc.flushTimer = null;
  }

  doc.destroy();
  docs.delete(docId);
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

/**
 * Flush all active documents to the persistence layer.
 * Usually called during graceful shutdown.
 */
export const flushAllDocuments = async () => {
  log.info(`Flushing ${docs.size} active documents to persistence...`);
  const mdb = getPersistence();
  const promises = [];

  for (const [docName] of docs.entries()) {
    // y-mongodb-provider's flush stores the full doc state as a single merged update
    promises.push(mdb.flushDocument(docName).catch(err => {
      log.error(`Failed to flush document ${docName}:`, err.message);
    }));
  }

  await Promise.all(promises);
  log.info(`All ${docs.size} documents flushed`);
};

export default { setupWebSocket, disconnectUserFromDoc, destroyRoom, flushAllDocuments };
