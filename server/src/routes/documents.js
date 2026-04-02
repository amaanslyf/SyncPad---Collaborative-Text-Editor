import { Router } from 'express';
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getRevisions,
  createRevision,
  getRevisionSnapshot,
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All document routes require authentication
router.use(authenticate);

router.get('/', listDocuments);
router.post('/', createDocument);
router.get('/:id', getDocument);
router.patch('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// Revision routes
router.get('/:id/revisions', getRevisions);
router.post('/:id/revisions', createRevision);
router.get('/:id/revisions/:revisionId', getRevisionSnapshot);

export default router;
