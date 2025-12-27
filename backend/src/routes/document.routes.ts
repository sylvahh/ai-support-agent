import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { upload } from '../middleware/upload';

const router = Router();

// POST /documents/upload - Upload a document
router.post('/upload', upload.single('file'), documentController.uploadDocument);

// GET /documents - Get all documents
router.get('/', documentController.getAllDocuments);

// GET /documents/stats - Get knowledge base stats
router.get('/stats', documentController.getKnowledgeBaseStats);

// GET /documents/:id - Get document by ID
router.get('/:id', documentController.getDocumentById);

// DELETE /documents/:id - Delete document
router.delete('/:id', documentController.deleteDocument);

export default router;
