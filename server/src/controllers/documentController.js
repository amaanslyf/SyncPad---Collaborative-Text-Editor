import Document from '../models/Document.js';
import User from '../models/User.js';
import { disconnectUserFromDoc, destroyRoom } from '../services/websocket/index.js';
import { getPersistence } from '../services/persistence.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('DocumentController');

/**
 * Reusable access check helper.
 * Returns { doc } on success, or { error, status, message } on failure.
 */
async function assertDocumentAccess(docId, userId, { populate = false } = {}) {
  let query = Document.findById(docId);
  if (populate) {
    query = query
      .populate('owner', 'displayName email color')
      .populate('collaborators', 'displayName email color')
      .populate('lastEditedBy', 'displayName color');
  }

  const doc = await query;
  if (!doc) {
    return { error: true, status: 404, message: 'Document not found' };
  }

  if (!doc.isPublic) {
    const ownerId = doc.owner?._id?.toString() || doc.owner?.toString();
    const isOwner = ownerId === userId;
    const isCollaborator = doc.collaborators.some((c) => {
      const cId = c._id?.toString() || c.toString();
      return cId === userId;
    });
    if (!isOwner && !isCollaborator) {
      return { error: true, status: 403, message: 'You do not have access to this document' };
    }
  }

  return { doc };
}

/**
 * GET /api/documents
 * List all documents accessible to the current user
 */
export const listDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    log.debug(`Listing documents for user: ${req.user.displayName}`);

    const documents = await Document.find({
      $or: [{ owner: userId }, { collaborators: userId }, { isPublic: true }],
    })
      .populate('owner', 'displayName email color')
      .populate('lastEditedBy', 'displayName color')
      .sort({ updatedAt: -1 })
      .select('-revisions') // Exclude heavy revision data from list
      .lean();

    log.info(`Found ${documents.length} documents for user: ${req.user.displayName}`);

    res.json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    log.error('Failed to list documents:', { message: error.message, userId: req.user.id });
    next(error);
  }
};

/**
 * POST /api/documents
 * Create a new document
 */
export const createDocument = async (req, res, next) => {
  try {
    const { title, isPublic, collaboratorEmails } = req.body;
    const userId = req.user.id;

    // Resolve collaborator emails to user IDs (if private + emails provided)
    let collaboratorIds = [];
    const warnings = [];

    if (
      Array.isArray(collaboratorEmails) &&
      collaboratorEmails.length > 0 &&
      isPublic === false
    ) {
      const normalizedEmails = collaboratorEmails
        .map((e) => (typeof e === 'string' ? e.toLowerCase().trim() : ''))
        .filter((e) => e.length > 0);

      // Remove duplicates
      const uniqueEmails = [...new Set(normalizedEmails)];

      if (uniqueEmails.length > 0) {
        const foundUsers = await User.find(
          { email: { $in: uniqueEmails } },
          '_id email'
        ).lean();

        const foundEmailSet = new Set(foundUsers.map((u) => u.email));

        // Collect IDs, filtering out the owner
        collaboratorIds = foundUsers
          .filter((u) => u._id.toString() !== userId)
          .map((u) => u._id);

        // Collect warnings for unregistered emails
        for (const email of uniqueEmails) {
          if (!foundEmailSet.has(email)) {
            warnings.push(`No SyncPad account found for: ${email}`);
          }
        }
      }
    }

    const document = await Document.create({
      title: title || 'Untitled Document',
      owner: userId,
      lastEditedBy: userId,
      isPublic: isPublic !== undefined ? isPublic : true,
      collaborators: collaboratorIds,
    });

    await document.populate('owner', 'displayName email color');
    await document.populate('collaborators', 'displayName email color');

    log.info(
      `Document created: "${document.title}" (${document._id}) by ${req.user.displayName} [${document.isPublic ? 'public' : 'private'}] with ${collaboratorIds.length} collaborator(s)`
    );

    const response = {
      success: true,
      data: { document },
    };

    if (warnings.length > 0) {
      response.data.warnings = warnings;
      log.info(`Create warnings: ${warnings.join('; ')}`);
    }

    res.status(201).json(response);
  } catch (error) {
    log.error('Failed to create document:', { message: error.message, userId: req.user.id });
    next(error);
  }
};

/**
 * GET /api/documents/:id
 * Get a single document by ID (with access check)
 */
export const getDocument = async (req, res, next) => {
  try {
    const { doc, error, status, message } = await assertDocumentAccess(
      req.params.id,
      req.user.id,
      { populate: true }
    );

    if (error) {
      log.warn(`getDocument access denied: ${req.params.id} for user ${req.user.id}`);
      return res.status(status).json({ success: false, message });
    }

    // Exclude revisions from response
    const docObj = doc.toJSON();
    delete docObj.revisions;

    log.debug(`Document fetched: "${doc.title}" (${doc._id})`);

    res.json({
      success: true,
      data: { document: docObj },
    });
  } catch (error) {
    log.error('Failed to get document:', { message: error.message, docId: req.params.id });
    next(error);
  }
};

/**
 * PATCH /api/documents/:id
 * Update document metadata (title, etc.)
 */
export const updateDocument = async (req, res, next) => {
  try {
    const { title } = req.body;

    const { doc: document, error, status, message } = await assertDocumentAccess(
      req.params.id,
      req.user.id
    );

    if (error) {
      log.warn(`updateDocument access denied: ${req.params.id}`);
      return res.status(status).json({ success: false, message });
    }

    const oldTitle = document.title;
    if (title !== undefined) {
      document.title = title;
    }
    document.lastEditedBy = req.user.id;
    await document.save();
    await document.populate('owner', 'displayName email color');

    log.info(`Document updated: "${oldTitle}" → "${document.title}" (${document._id})`);

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    log.error('Failed to update document:', { message: error.message, docId: req.params.id });
    next(error);
  }
};

/**
 * DELETE /api/documents/:id
 * Delete a document (owner only)
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      log.warn(`Delete failed — document not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Only owner can delete
    if (document.owner.toString() !== req.user.id) {
      log.warn(`Delete forbidden — user ${req.user.id} tried to delete doc owned by ${document.owner}`);
      return res.status(403).json({
        success: false,
        message: 'Only the document owner can delete it',
      });
    }

    // 1. Purge Yjs state from MongoDB (y-mongodb-provider collection)
    try {
      const mdb = getPersistence();
      await mdb.clearDocument(req.params.id);
      log.info(`Deleted Yjs data for doc: ${req.params.id}`);
    } catch (err) {
      log.error(`Failed to clear Yjs data for doc ${req.params.id}:`, err.message);
      // Continue anyway to delete the metadata
    }

    // 2. Clear memory room in WebSocket service
    destroyRoom(req.params.id);

    // 3. Delete metadata record in Mongoose
    await Document.findByIdAndDelete(req.params.id);

    log.info(`Document deleted: "${document.title}" (${document._id}) by ${req.user.displayName}`);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    log.error('Failed to delete document:', { message: error.message, docId: req.params.id });
    next(error);
  }
};

/**
 * GET /api/documents/:id/revisions
 * Get revision history for a document (with access check)
 */
export const getRevisions = async (req, res, next) => {
  try {
    // Access check first
    const { error, status, message } = await assertDocumentAccess(req.params.id, req.user.id);
    if (error) {
      return res.status(status).json({ success: false, message });
    }

    const document = await Document.findById(req.params.id)
      .select('revisions title')
      .lean();

    if (!document) {
      log.warn(`Revisions fetch failed — document not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Return revisions without the heavy snapshot buffer
    const revisions = document.revisions.map((rev) => ({
      id: rev._id,
      label: rev.label,
      createdBy: rev.createdBy,
      createdByName: rev.createdByName,
      createdAt: rev.createdAt,
    }));

    log.debug(`Fetched ${revisions.length} revisions for doc: ${req.params.id}`);

    res.json({
      success: true,
      data: { revisions },
    });
  } catch (error) {
    log.error('Failed to get revisions:', { message: error.message, docId: req.params.id });
    next(error);
  }
};

/**
 * POST /api/documents/:id/revisions
 * Create a manual revision snapshot (with access check)
 */
export const createRevision = async (req, res, next) => {
  try {
    // Access check first
    const { doc: document, error, status, message } = await assertDocumentAccess(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(status).json({ success: false, message });
    }

    const { label, snapshot } = req.body;

    if (!snapshot) {
      log.warn(`Revision creation failed — no snapshot data for doc: ${req.params.id}`);
      return res.status(400).json({
        success: false,
        message: 'Snapshot data is required',
      });
    }

    document.revisions.push({
      snapshot: Buffer.from(snapshot, 'base64'),
      label: label || `Snapshot by ${req.user.displayName || 'User'}`,
      createdBy: req.user.id,
      createdByName: req.user.displayName || 'User',
    });

    // Keep only last 50 revisions to stay within MongoDB free tier limits
    if (document.revisions.length > 50) {
      const trimmed = document.revisions.length - 50;
      document.revisions = document.revisions.slice(-50);
      log.info(`Trimmed ${trimmed} old revisions for doc: ${req.params.id}`);
    }

    await document.save();

    log.info(`Revision saved for doc "${document.title}" (${document._id}) by ${req.user.displayName}`);

    res.status(201).json({
      success: true,
      message: 'Revision saved',
    });
  } catch (error) {
    log.error('Failed to create revision:', { message: error.message, docId: req.params.id });
    next(error);
  }
};

/**
 * GET /api/documents/:id/revisions/:revisionId
 * Get a specific revision snapshot (with access check)
 */
export const getRevisionSnapshot = async (req, res, next) => {
  try {
    // Access check first
    const { error, status, message } = await assertDocumentAccess(req.params.id, req.user.id);
    if (error) {
      return res.status(status).json({ success: false, message });
    }

    const document = await Document.findById(req.params.id).select('revisions');

    if (!document) {
      log.warn(`Revision snapshot fetch failed — document not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const revision = document.revisions.id(req.params.revisionId);
    if (!revision) {
      log.warn(`Revision not found: ${req.params.revisionId} in doc: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Revision not found',
      });
    }

    log.debug(`Revision snapshot fetched: ${req.params.revisionId} from doc: ${req.params.id}`);

    res.json({
      success: true,
      data: {
        snapshot: revision.snapshot.toString('base64'),
        label: revision.label,
        createdAt: revision.createdAt,
      },
    });
  } catch (error) {
    log.error('Failed to get revision snapshot:', {
      message: error.message,
      docId: req.params.id,
      revisionId: req.params.revisionId,
    });
    next(error);
  }
};

// ─── Collaborator Management ──────────────────────────────

/**
 * GET /api/documents/:id/collaborators
 * Get the list of collaborators for a document
 */
export const getCollaborators = async (req, res, next) => {
  try {
    const { doc, error, status, message } = await assertDocumentAccess(
      req.params.id,
      req.user.id,
      { populate: true }
    );

    if (error) {
      return res.status(status).json({ success: false, message });
    }

    log.debug(`Fetched collaborators for doc: ${req.params.id}`);

    res.json({
      success: true,
      data: {
        owner: doc.owner,
        collaborators: doc.collaborators,
        isPublic: doc.isPublic,
      },
    });
  } catch (error) {
    log.error('Failed to get collaborators:', { message: error.message, docId: req.params.id });
    next(error);
  }
};

/**
 * POST /api/documents/:id/collaborators
 * Add a collaborator by email (owner only)
 */
export const addCollaborator = async (req, res, next) => {
  try {
    const { email } = req.body;
    const docId = req.params.id;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Only the owner can add collaborators
    if (document.owner.toString() !== req.user.id) {
      log.warn(`addCollaborator forbidden — user ${req.user.id} is not owner of doc ${docId}`);
      return res.status(403).json({
        success: false,
        message: 'Only the document owner can invite collaborators',
      });
    }

    // Look up the user by email
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      log.info(`addCollaborator — no SyncPad account for: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'No SyncPad account found for this email. The user must register first.',
      });
    }

    // Can't invite yourself
    if (targetUser._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You are the owner — no need to invite yourself',
      });
    }

    // Check if already a collaborator
    const alreadyCollaborator = document.collaborators.some(
      (c) => c.toString() === targetUser._id.toString()
    );
    if (alreadyCollaborator) {
      return res.status(409).json({
        success: false,
        message: 'This user is already a collaborator on this document',
      });
    }

    document.collaborators.push(targetUser._id);
    await document.save();

    await document.populate('owner', 'displayName email color');
    await document.populate('collaborators', 'displayName email color');

    log.info(
      `Collaborator added: ${targetUser.displayName} (${targetUser.email}) to doc "${document.title}" (${docId})`
    );

    res.status(201).json({
      success: true,
      message: `${targetUser.displayName} has been added as a collaborator`,
      data: {
        collaborator: {
          _id: targetUser._id,
          displayName: targetUser.displayName,
          email: targetUser.email,
          color: targetUser.color,
        },
        collaborators: document.collaborators,
      },
    });
  } catch (error) {
    log.error('Failed to add collaborator:', { message: error.message, docId: req.params.id });
    next(error);
  }
};

/**
 * DELETE /api/documents/:id/collaborators/:userId
 * Remove a collaborator (owner only)
 */
export const removeCollaborator = async (req, res, next) => {
  try {
    const { id: docId, userId: targetUserId } = req.params;

    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Only the owner can remove collaborators
    if (document.owner.toString() !== req.user.id) {
      log.warn(`removeCollaborator forbidden — user ${req.user.id} is not owner of doc ${docId}`);
      return res.status(403).json({
        success: false,
        message: 'Only the document owner can remove collaborators',
      });
    }

    // Check if user is actually a collaborator
    const collabIndex = document.collaborators.findIndex(
      (c) => c.toString() === targetUserId
    );
    if (collabIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User is not a collaborator on this document',
      });
    }

    document.collaborators.splice(collabIndex, 1);
    await document.save();

    // Force-disconnect the removed user from the WebSocket room immediately
    disconnectUserFromDoc(docId, targetUserId);

    await document.populate('collaborators', 'displayName email color');

    log.info(`Collaborator removed: ${targetUserId} from doc "${document.title}" (${docId})`);

    res.json({
      success: true,
      message: 'Collaborator removed',
      data: {
        removedUserId: targetUserId,
        collaborators: document.collaborators,
      },
    });
  } catch (error) {
    log.error('Failed to remove collaborator:', { message: error.message, docId: req.params.id });
    next(error);
  }
};
