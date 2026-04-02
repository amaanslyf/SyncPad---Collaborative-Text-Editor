import Document from '../models/Document.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('DocumentController');

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
    const { title } = req.body;
    const userId = req.user.id;

    const document = await Document.create({
      title: title || 'Untitled Document',
      owner: userId,
      lastEditedBy: userId,
    });

    await document.populate('owner', 'displayName email color');

    log.info(`Document created: "${document.title}" (${document._id}) by ${req.user.displayName}`);

    res.status(201).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    log.error('Failed to create document:', { message: error.message, userId: req.user.id });
    next(error);
  }
};

/**
 * GET /api/documents/:id
 * Get a single document by ID
 */
export const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'displayName email color')
      .populate('collaborators', 'displayName email color')
      .populate('lastEditedBy', 'displayName color')
      .select('-revisions');

    if (!document) {
      log.warn(`Document not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    log.debug(`Document fetched: "${document.title}" (${document._id})`);

    res.json({
      success: true,
      data: { document },
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
    const document = await Document.findById(req.params.id);

    if (!document) {
      log.warn(`Update failed — document not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
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
 * Get revision history for a document
 */
export const getRevisions = async (req, res, next) => {
  try {
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
 * Create a manual revision snapshot
 */
export const createRevision = async (req, res, next) => {
  try {
    const { label, snapshot } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      log.warn(`Revision creation failed — document not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

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
 * Get a specific revision snapshot
 */
export const getRevisionSnapshot = async (req, res, next) => {
  try {
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
