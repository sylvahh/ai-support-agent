import { Pinecone, Index } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

export interface VectorMetadata {
  text: string;
  documentId: string;
  chunkIndex: number;
  filename: string;
  [key: string]: string | number; // Index signature for Pinecone compatibility
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface SearchMatch {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
  }
  return pineconeClient;
}

export function getIndex(): Index {
  if (!pineconeIndex) {
    const pinecone = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME || '';
    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME environment variable is not set');
    }
    pineconeIndex = pinecone.index(indexName);
  }
  return pineconeIndex;
}

export async function upsertVectors(vectors: VectorRecord[]): Promise<void> {
  try {
    const index = getIndex();
    await index.upsert(vectors);
    console.log(`Upserted ${vectors.length} vectors to Pinecone`);
  } catch (error) {
    console.error('Error upserting vectors:', error);
    throw new Error('Failed to upsert vectors to Pinecone');
  }
}

export async function searchVectors(
  queryVector: number[],
  topK: number = 5
): Promise<SearchMatch[]> {
  try {
    const index = getIndex();

    let searchResponse;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        searchResponse = await index.query({
          vector: queryVector,
          topK,
          includeMetadata: true,
        });
        break;
      } catch (error) {
        retryCount++;
        console.error(`Pinecone search attempt ${retryCount} failed:`, error);
        if (retryCount >= maxRetries) {
          throw new Error('Pinecone search failed after 3 attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!searchResponse?.matches) {
      return [];
    }

    return searchResponse.matches.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as unknown as VectorMetadata,
    }));
  } catch (error) {
    console.error('Error searching vectors:', error);
    throw new Error('Failed to search vectors in Pinecone');
  }
}

export async function deleteVectorsByDocumentId(documentId: string): Promise<void> {
  try {
    const index = getIndex();
    await index.deleteMany({
      filter: {
        documentId: { $eq: documentId },
      },
    });
    console.log(`Deleted vectors for document ${documentId}`);
  } catch (error) {
    console.error('Error deleting vectors:', error);
    throw new Error('Failed to delete vectors from Pinecone');
  }
}

export async function getIndexStats(): Promise<{ totalVectorCount: number }> {
  try {
    const index = getIndex();
    const stats = await index.describeIndexStats();
    return {
      totalVectorCount: stats.totalRecordCount || 0,
    };
  } catch (error) {
    console.error('Error getting index stats:', error);
    return { totalVectorCount: 0 };
  }
}

export async function hasDocuments(): Promise<boolean> {
  const stats = await getIndexStats();
  return stats.totalVectorCount > 0;
}
