import prismaClient from '../config/database';
import { generateEmbeddings } from './embedding.service';
import { upsertVectors, deleteVectorsByDocumentId, VectorRecord } from './pinecone.service';
const pdfParse = require('pdf-parse');

// Cast prisma to any until `npx prisma generate` is run with new models
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = prismaClient as any;

interface UploadDocumentInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

interface ChunkData {
  content: string;
  chunkIndex: number;
}

const TARGET_CHUNK_SIZE = 512;
const OVERLAP_SIZE = 50;

// Helper to check if error is a database connection issue
function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("can't reach database server") ||
      message.includes('connection refused') ||
      message.includes('connection timed out') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('enotfound')
    );
  }
  return false;
}

// Custom error class for user-friendly errors
export class ServiceError extends Error {
  public readonly userMessage: string;
  public readonly isRetryable: boolean;

  constructor(message: string, userMessage: string, isRetryable = false) {
    super(message);
    this.name = 'ServiceError';
    this.userMessage = userMessage;
    this.isRetryable = isRetryable;
  }
}

// Extract text from file based on type
async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  try {
    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    }
    // For text files
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error('Failed to extract text from file');
  }
}

// Chunk text into smaller pieces with overlap
function chunkText(text: string): ChunkData[] {
  const chunks: ChunkData[] = [];
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);

  let currentChunk = '';
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

    if (potentialChunk.length > TARGET_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex,
      });

      // Create overlap by keeping last N words
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-OVERLAP_SIZE);
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
      chunkIndex++;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add remaining content as final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex,
    });
  }

  return chunks;
}

// Upload and process a document
export async function uploadDocument(input: UploadDocumentInput) {
  const { buffer, originalname, mimetype, size } = input;

  try {
   // Extract text from document
    const text = await extractText(buffer, mimetype);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in document');
    }

    // Chunk the text
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error('Failed to create chunks from document');
    }

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        filename: originalname,
        contentType: mimetype,
        size,
        totalChunks: chunks.length,
      },
    });

    // Save chunks to database
    const savedChunks = await Promise.all(
      chunks.map(chunk =>
        prisma.chunk.create({
          data: {
            documentId: document.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
          },
        })
      )
    );

    // Generate embeddings for all chunks
    const chunkTexts = savedChunks.map(chunk => chunk.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    // Prepare vectors for Pinecone
    const vectors: VectorRecord[] = savedChunks.map((chunk, i) => ({
      id: chunk.id,
      values: embeddings[i],
      metadata: {
        text: chunk.content,
        documentId: document.id,
        chunkIndex: chunk.chunkIndex,
        filename: document.filename,
      },
    }));

    // Upsert vectors to Pinecone
    await upsertVectors(vectors);

    // Update chunks with Pinecone vector IDs
    await Promise.all(
      savedChunks.map(chunk =>
        prisma.chunk.update({
          where: { id: chunk.id },
          data: { pineconeVectorId: chunk.id },
        })
      )
    );

    console.log(`Document "${originalname}" uploaded successfully with ${chunks.length} chunks`);

    return {
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        totalChunks: document.totalChunks,
        size: document.size,
      },
    };
  } catch (error) {
    console.error('Error uploading document:', error);

    // Provide user-friendly error messages
    if (isDatabaseConnectionError(error)) {
      throw new ServiceError(
        error instanceof Error ? error.message : 'Database connection failed',
        'Unable to connect to the database. Please try again in a few seconds.',
        true
      );
    }

    if (error instanceof Error && error.message.includes('No text content')) {
      throw new ServiceError(error.message, 'The document appears to be empty or unreadable.', false);
    }

    if (error instanceof Error && error.message.includes('Failed to extract text')) {
      throw new ServiceError(error.message, 'Could not read the document. Please ensure it\'s a valid PDF or text file.', false);
    }

    throw new ServiceError(
      error instanceof Error ? error.message : 'Unknown error',
      'An unexpected error occurred while uploading the document. Please try again.',
      true
    );
  }
}

// Get all documents
export async function getAllDocuments() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      contentType: true,
      size: true,
      totalChunks: true,
      createdAt: true,
    },
  });

  return documents;
}

// Get document by ID
export async function getDocumentById(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
      },
    },
  });

  return document;
}

// Delete document and its vectors
export async function deleteDocument(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Delete vectors from Pinecone
  await deleteVectorsByDocumentId(id);

  // Delete document (cascades to chunks)
  await prisma.document.delete({
    where: { id },
  });

  console.log(`Document "${document.filename}" deleted successfully`);

  return { success: true, filename: document.filename };
}
