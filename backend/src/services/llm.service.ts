import Groq from 'groq-sdk';
import { SYSTEM_PROMPT, SUMMARY_PROMPT } from '../prompts/system-prompt';

interface MessageHistory {
  sender: 'user' | 'ai';
  text: string;
}

interface Attachment {
  url: string;
  mimeType: string;
}

interface LLMResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateReply(
  history: MessageHistory[],
  userMessage: string,
  attachment?: Attachment
): Promise<LLMResponse> {
  try {
    // Build conversation history for context
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add conversation history (limit to last 20 messages for context window)
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    }

    // Add current message
    let currentMessage = userMessage;

    // If there's an attachment, mention it in the message
    if (attachment) {
      const fileType = attachment.mimeType.split('/')[1] || 'file';
      currentMessage = `[User attached a ${fileType} file: ${attachment.url}]\n\n${userMessage}`;
    }

    messages.push({ role: 'user', content: currentMessage });

    // Generate response
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const text = completion.choices[0]?.message?.content;

    if (!text) {
      return {
        success: false,
        error: 'No response generated from AI',
      };
    }

    return {
      success: true,
      reply: text,
    };
  } catch (error: unknown) {
    console.error('LLM Service Error:', error);

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid')) {
        return {
          success: false,
          error: 'Service configuration error. Please contact support.',
        };
      }

      if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        return {
          success: false,
          error: 'Our service is experiencing high demand. Please try again in a moment.',
        };
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('deadline')) {
        return {
          success: false,
          error: 'The request took too long. Please try again.',
        };
      }
    }

    return {
      success: false,
      error: 'I apologize, but I encountered an issue processing your request. Please try again.',
    };
  }
}

export async function generateConversationSummary(
  history: MessageHistory[]
): Promise<LLMResponse> {
  try {
    const conversationText = history
      .map((msg) => `${msg.sender === 'user' ? 'Customer' : 'Support'}: ${msg.text}`)
      .join('\n');

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `${SUMMARY_PROMPT}\n\n${conversationText}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 256,
    });

    const summary = completion.choices[0]?.message?.content;

    if (!summary) {
      return {
        success: false,
        error: 'Could not generate summary',
      };
    }

    return {
      success: true,
      reply: summary,
    };
  } catch (error) {
    console.error('Summary Generation Error:', error);
    return {
      success: false,
      error: 'Could not generate conversation summary',
    };
  }
}
