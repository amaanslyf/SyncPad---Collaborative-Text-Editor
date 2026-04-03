import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { createEncoder, toUint8Array, writeVarUint } from 'lib0/encoding';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('MessageHandler');

const messageSync = 0;
const messageAwareness = 1;

/**
 * Handle incoming WebSocket messages
 */
export const handleMessage = (conn, room, message) => {
  try {
    const decoder = decoding.createDecoder(new Uint8Array(message));
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        const encoder = createEncoder();
        writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);
        const reply = toUint8Array(encoder);
        if (reply.length > 1) {
          conn.send(reply);
        }
        break;
      }
      case messageAwareness: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn);
        break;
      }
      default:
        log.warn(`Unknown message type: ${messageType} in room "${room.name}"`);
    }
  } catch (err) {
    log.error(`Error handling message in room "${room.name}":`, {
      message: err.message,
      user: conn.user?.displayName,
    });
  }
};
