import { Request, Response } from 'express';
import * as documentService from '../services/document.service';
import { ServiceError } from '../services/document.service';
import { getIndexStats } from '../services/pinecone.service';

// Upload a document
export async function uploadDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Allowed: PDF, TXT, MD',
      });
    }

    const result = await documentService.uploadDocument({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Upload document error:', error);

    if (error instanceof ServiceError) {
      return res.status(503).json({
        success: false,
        error: error.userMessage,
        retryable: error.isRetryable,
      });
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload document',
    });
  }
}

// Get all documents
export async function getAllDocuments(req: Request, res: Response) {
  try {
    const documents = await documentService.getAllDocuments();

    return res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get documents',
    });
  }
}

// Get document by ID
export async function getDocumentById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const document = await documentService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    return res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get document error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get document',
    });
  }
}

// Delete document
export async function deleteDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await documentService.deleteDocument(id);

    return res.json(result);
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document',
    });
  }
}

// Get knowledge base stats
export async function getKnowledgeBaseStats(req: Request, res: Response) {
  try {
    const documents = await documentService.getAllDocuments();
    const pineconeStats = await getIndexStats();

    return res.json({
      success: true,
      stats: {
        totalDocuments: documents.length,
        totalVectors: pineconeStats.totalVectorCount,
        documents: documents.map((doc: { filename: string; totalChunks: number }) => ({
          filename: doc.filename,
          chunks: doc.totalChunks,
        })),
      },
    });
  } catch (error) {
    console.error('Get KB stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get knowledge base stats',
    });
  }
}
