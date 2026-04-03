import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { createEncoder, toUint8Array, writeVarUint } from 'lib0/encoding';
import * as encoding from 'lib0/encoding';
import { getPersistence } from '../persistence.js';
import config from '../../config/config.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('Room');

const messageSync = 0;
const messageAwareness = 1;

/**
 * Represents a single collaborative document room.
 * Manages the Y.Doc, awareness state, connected clients, and persistence sync.
 */
export class Room {
  constructor(docName) {
    this.name = docName;
    this.doc = new Y.Doc();
    this.doc.name = docName;
    this.conns = new Map(); // ws -> Set<number> (awareness client ids)
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.flushTimer = null;
    
    this._initPersistence();
    this._initHandlers();
  }

  /**
   * Load initial state from persistence and setup auto-save
   */
  async _initPersistence() {
    try {
      const mdb = getPersistence();
      const persistedDoc = await mdb.getYDoc(this.name);
      
      const state = Y.encodeStateAsUpdate(persistedDoc);
      if (state.length > 2) {
        Y.applyUpdate(this.doc, state);
        log.info(`✅ Loaded persisted state for room: "${this.name}" (${state.length} bytes)`);
      }
      persistedDoc.destroy();
    } catch (err) {
      log.error(`❌ Failed to load persisted state for room "${this.name}":`, err.message);
    }
  }

  /**
   * Attach Yjs update and awareness update listeners
   */
  _initHandlers() {
    // 1. Listen for document updates and persist/broadcast them
    this.doc.on('update', async (update, origin) => {
      this._persistUpdate(update);
      this._broadcastUpdate(update, origin);
    });

    // 2. Listen for awareness updates (cursors, presence) and broadcast them
    this.awareness.on('update', ({ added, updated, removed }) => {
      this._broadcastAwareness(added.concat(updated).concat(removed));
    });
  }

  /**
   * Persist a binary update to MongoDB with debounced flushing
   */
  async _persistUpdate(update) {
    try {
      const mdb = getPersistence();
      await mdb.storeUpdate(this.name, update);
      
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(async () => {
        try {
          await mdb.flushDocument(this.name);
          log.debug(`✅ Debounced flush complete for room: "${this.name}"`);
        } catch (err) {
          log.error(`❌ Flush failed for "${this.name}":`, err.message);
        }
      }, config.ws.flushInterval);
    } catch (err) {
      log.error(`❌ Persistence failed for "${this.name}":`, err.message);
    }
  }

  /**
   * Broadcast a Yjs update to all clients except the origin
   */
  _broadcastUpdate(update, origin) {
    const encoder = createEncoder();
    writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = toUint8Array(encoder);

    this.conns.forEach((_, conn) => {
      if (conn !== origin && conn.readyState === conn.OPEN) {
        try {
          conn.send(message);
        } catch (err) {
          log.warn(`Broadcast failed in room "${this.name}":`, err.message);
        }
      }
    });
  }

  /**
   * Broadcast awareness changes to all connected clients
   */
  _broadcastAwareness(changedClients) {
    const encoder = createEncoder();
    writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
    );
    const message = toUint8Array(encoder);

    this.conns.forEach((_, conn) => {
      if (conn.readyState === conn.OPEN) {
        try {
          conn.send(message);
        } catch {
          // Ignore broadcast failures to dead connections
        }
      }
    });
  }

  /**
   * Add a new connection to the room
   */
  addConnection(conn) {
    this.conns.set(conn, new Set());
  }

  /**
   * Remove a connection from the room and clean up awareness
   */
  removeConnection(conn) {
    const awarenessIds = this.conns.get(conn);
    this.conns.delete(conn);
    if (awarenessIds) {
      awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(awarenessIds), null);
    }
    return this.conns.size;
  }

  /**
   * Perform a final flush and destroy the room
   */
  async destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    try {
      await getPersistence().flushDocument(this.name);
    } catch (err) {
      log.warn(`Final flush failed for "${this.name}": ${err.message}`);
    }

    this.doc.destroy();
    log.info(`Room "${this.name}" destroyed`);
  }
}
