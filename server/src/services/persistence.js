import { MongodbPersistence } from 'y-mongodb-provider';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Persistence');

let mdb = null;

/**
 * Initialize the MongoDB persistence layer for Yjs documents
 */
export const initPersistence = (mongoUri) => {
  try {
    mdb = new MongodbPersistence(mongoUri, {
      collectionName: 'yjs-documents',
      flushSize: 100, // Flush updates to DB after 100 operations
      multipleCollections: false,
    });

    log.info('Yjs MongoDB persistence initialized', { collection: 'yjs-documents', flushSize: 100 });
    return mdb;
  } catch (error) {
    log.error('Failed to initialize Yjs persistence:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get the persistence instance
 */
export const getPersistence = () => {
  if (!mdb) {
    const error = new Error('Persistence not initialized. Call initPersistence first.');
    log.error(error.message);
    throw error;
  }
  return mdb;
};

export default { initPersistence, getPersistence };
