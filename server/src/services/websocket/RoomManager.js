import { Room } from './Room.js';
import config from '../../config/config.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('RoomManager');

/**
 * Manages the collection of active document rooms.
 * Handles room creation, caching, and idle cleanup.
 */
class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Get or create a room for a document
   */
  async getRoom(docName) {
    if (this.rooms.has(docName)) {
      return this.rooms.get(docName);
    }

    const room = new Room(docName);
    this.rooms.set(docName, room);
    return room;
  }

  /**
   * Handle room cleanup when a client closes
   */
  async handleClientClose(conn, room) {
    const remainingConns = room.removeConnection(conn);
    
    // If no more clients, schedule destruction after idle timeout
    if (remainingConns === 0) {
      log.info(`Room "${room.name}" is empty — scheduling cleanup in ${config.ws.idleTimeout}ms`);
      
      setTimeout(async () => {
        const currentRoom = this.rooms.get(room.name);
        if (currentRoom && currentRoom.conns.size === 0) {
          await currentRoom.destroy();
          this.rooms.delete(room.name);
          log.info(`Room "${room.name}" destroyed after idle timeout`);
        }
      }, config.ws.idleTimeout);
    }
  }

  /**
   * Forcefully disconnect a user from a room (access revoked)
   */
  forceDisconnectUser(docId, userId) {
    const room = this.rooms.get(docId);
    if (!room) return;

    room.conns.forEach((_, conn) => {
      if (conn.user && conn.user.id === userId) {
        log.info(`Force-disconnecting user ${userId} from room "${docId}" (access revoked)`);
        try {
          conn.close(4403, 'Access revoked');
        } catch {
          conn.terminate();
        }
      }
    });
  }

  /**
   * Forcefully destroy a room (document deleted)
   */
  async destroyRoom(docId) {
    const room = this.rooms.get(docId);
    if (!room) return;

    log.info(`Force-destroying room "${docId}" (document deleted)`);
    await room.destroy();
    this.rooms.delete(docId);
  }

  /**
   * Flush all active rooms to persistence
   */
  async flushAll() {
    log.info(`Flushing ${this.rooms.size} active rooms...`);
    const promises = Array.from(this.rooms.values()).map(room => room.destroy());
    await Promise.all(promises);
    this.rooms.clear();
  }
}

export const roomManager = new RoomManager();
