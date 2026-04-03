import Document from '../../models/Document.js';
import { createLogger } from '../../utils/logger.js';
import { authenticateWS } from '../../middleware/auth.js';

const log = createLogger('Auth');

/**
 * Authenticate a WebSocket connection via token.
 */
export const authenticate = async (token) => {
  return await authenticateWS(token);
};

/**
 * Check if a user has access to a specific document.
 */
export const checkDocumentAccess = async (documentId, userId) => {
  try {
    const document = await Document.findById(documentId).lean();
    if (!document) {
      log.warn(`Document not found during access check: ${documentId}`);
      return false;
    }

    // Public documents are accessible to all authenticated users
    if (document.isPublic) {
      return true;
    }

    // Private documents must be owned or collaborated on by the user
    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(
      (c) => c.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      log.warn(`Access denied for user ${userId} on doc ${documentId}`);
      return false;
    }

    return true;
  } catch (err) {
    log.error(`Access check error for doc ${documentId}:`, err.message);
    return false;
  }
};
