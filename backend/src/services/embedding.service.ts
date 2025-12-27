import { Pinecone } from '@pinecone-database/pinecone';

const EMBEDDING_MODEL = 'llama-text-embed-v2';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
  }
  return pineconeClient;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`${operationName} attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} attempts`);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const pinecone = getPineconeClient();
    const response = await pinecone.inference.embed(
      EMBEDDING_MODEL,
      [text],
      { inputType: 'passage', truncate: 'END' }
    );

    const embedding = response.data[0];
    if (!embedding || !('values' in embedding)) {
      throw new Error('Invalid embedding response');
    }
    return embedding.values as number[];
  }, 'generateEmbedding');
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return withRetry(async () => {
    const pinecone = getPineconeClient();
    const response = await pinecone.inference.embed(
      EMBEDDING_MODEL,
      texts,
      { inputType: 'passage', truncate: 'END' }
    );

    return response.data.map(item => {
      if (!('values' in item)) {
        throw new Error('Invalid embedding response');
      }
      return item.values as number[];
    });
  }, 'generateEmbeddings');
}

export async function generateQueryEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const pinecone = getPineconeClient();
    const response = await pinecone.inference.embed(
      EMBEDDING_MODEL,
      [text],
      { inputType: 'query', truncate: 'END' }
    );

    const embedding = response.data[0];
    if (!embedding || !('values' in embedding)) {
      throw new Error('Invalid embedding response');
    }
    return embedding.values as number[];
  }, 'generateQueryEmbedding');
}
