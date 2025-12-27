import { generateQueryEmbedding } from './embedding.service';
import { searchVectors, hasDocuments, SearchMatch } from './pinecone.service';

const MAX_CONTEXT_LENGTH = 16000; // ~4K tokens

export interface RAGContext {
  hasKnowledgeBase: boolean;
  context: string;
  sources: Array<{
    filename: string;
    chunkIndex: number;
    score: number;
  }>;
}

// Assemble context from search matches
function assembleContext(matches: SearchMatch[]): string {
  // Sort by relevance score (highest first)
  const sortedMatches = [...matches].sort((a, b) => b.score - a.score);

  // Remove duplicates based on text content
  const uniqueMatches = sortedMatches.filter(
    (match, index, self) =>
      index === self.findIndex(m => m.metadata.text === match.metadata.text)
  );

  // Combine chunks into context
  const context = uniqueMatches
    .map(
      match =>
        `[Source: ${match.metadata.filename}]\n${match.metadata.text}`
    )
    .join('\n\n');

  // Limit context size
  if (context.length > MAX_CONTEXT_LENGTH) {
    return context.substring(0, MAX_CONTEXT_LENGTH) + '...';
  }

  return context;
}

// Query the knowledge base for relevant context
export async function queryKnowledgeBase(query: string): Promise<RAGContext> {
  try {
    // Check if any documents exist in Pinecone
    const hasKB = await hasDocuments();

    if (!hasKB) {
      return {
        hasKnowledgeBase: false,
        context: '',
        sources: [],
      };
    }

    // Generate embedding for the query
    const queryVector = await generateQueryEmbedding(query);

    // Search for relevant chunks
    const matches = await searchVectors(queryVector, 5);

    if (!matches || matches.length === 0) {
      return {
        hasKnowledgeBase: true,
        context: '',
        sources: [],
      };
    }

    // Assemble context from matches
    const context = assembleContext(matches);

    // Extract source information
    const sources = matches.map(match => ({
      filename: match.metadata.filename,
      chunkIndex: match.metadata.chunkIndex,
      score: match.score,
    }));

    return {
      hasKnowledgeBase: true,
      context,
      sources,
    };
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    // Return empty context on error, will fallback to hardcoded prompt
    return {
      hasKnowledgeBase: false,
      context: '',
      sources: [],
    };
  }
}

// Build RAG system prompt with context
export function buildRAGSystemPrompt(context: string): string {
  return `You are Ava, a friendly and professional customer support representative for ShopEase, an online electronics store. You help customers with questions about products, orders, shipping, returns, and policies.

## YOUR PERSONALITY
- Warm, helpful, and conversational - like talking to a knowledgeable friend
- Professional but not robotic
- Concise and to the point (2-4 sentences when possible)
- Always offer to help with anything else at the end

## COMPANY INFORMATION
Here's what you know about ShopEase policies and information:

${context}

## IMPORTANT RULES
- Answer naturally as if you simply know this information - NEVER say things like "based on the context", "according to my knowledge base", or "the information provided shows"
- If asked about something you don't have information on, simply say "I don't have specific details on that, but I'd be happy to connect you with our team at support@shopease.com or 1-800-SHOP-EASE who can help!"
- Never mention documents, chunks, sources, or any technical details about how you got the information
- Keep responses friendly and human-like
- Use bullet points for lists when helpful

## OFF-TOPIC HANDLING
If asked about anything unrelated to ShopEase (celebrities, politics, general knowledge, etc.), respond with:
"I'm here to help with your ShopEase shopping experience! Is there anything about our products, orders, or policies I can assist you with?"

## ESCALATION
For frustrated customers, complex issues, or requests to speak with someone, offer: "I'd be happy to connect you with our support team at support@shopease.com or 1-800-SHOP-EASE (Mon-Fri 9AM-8PM, Sat 10AM-6PM EST)."`;
}
