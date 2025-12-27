import { conversationRepository, messageRepository } from '../repositories';
import type { MessageWithAttachments } from '../repositories';
import { generateReply, generateConversationSummary } from './llm.service';
import { uploadFile, UploadResult } from './upload.service';
import {
  CONVERSATION_CLOSED_MESSAGE,
  CONVERSATION_WARNING_MESSAGE,
  CONVERSATION_REOPENED_MESSAGE,
} from '../prompts/system-prompt';

type ConversationStatus = 'open' | 'closed';

interface SendMessageInput {
  message: string;
  sessionId?: string;
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
}

interface SendMessageResult {
  success: boolean;
  reply?: string;
  sessionId?: string;
  attachment?: {
    id: string;
    fileName: string;
    fileUrl: string;
  };
  error?: string;
}

interface ConversationStatusResult {
  status: ConversationStatus;
  warningIssued: boolean;
  timeUntilWarning?: number;
  timeUntilClose?: number;
  lastAiMessageReadAt?: Date;
}

// Get or create a conversation
async function getOrCreateConversation(sessionId?: string) {
  if (sessionId) {
    const existing = await conversationRepository.findById(sessionId);
    if (existing) {
      return existing;
    }
  }
  return conversationRepository.create();
}

// Send a message and get AI response
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  try {
    const { message, sessionId, file } = input;

    // Get or create conversation
    const conversation = await getOrCreateConversation(sessionId);

    // Check if conversation is closed
    if (conversation.status === 'closed') {
      return {
        success: false,
        sessionId: conversation.id,
        error: 'This conversation is closed. Please reopen it to continue.',
      };
    }

    // Handle file upload if present
    let uploadResult: UploadResult | undefined;
    if (file) {
      uploadResult = await uploadFile(file.buffer, file.originalname, file.mimetype);
    }

    // Create user message
    const userMessage = await messageRepository.createWithAttachment({
      conversationId: conversation.id,
      sender: 'user',
      text: message,
      isRead: true,
      readAt: new Date(),
      attachment: uploadResult
        ? {
            fileName: uploadResult.fileName,
            fileType: uploadResult.fileType,
            fileUrl: uploadResult.url,
            cloudinaryPublicId: uploadResult.publicId,
            fileSize: uploadResult.fileSize,
          }
        : undefined,
    });

    // Get conversation history for context
    const history = await messageRepository.findByConversationId(conversation.id);
    const historyForLLM = history.slice(0, -1).map((msg: MessageWithAttachments) => ({
      sender: msg.sender as 'user' | 'ai',
      text: msg.text,
    }));

    // Generate AI response
    const llmResponse = await generateReply(
      historyForLLM,
      message,
      uploadResult
        ? { url: uploadResult.url, mimeType: uploadResult.fileType }
        : undefined
    );

    if (!llmResponse.success || !llmResponse.reply) {
      return {
        success: false,
        sessionId: conversation.id,
        error: llmResponse.error || 'Failed to generate response',
      };
    }

    // Create AI message
    await messageRepository.create({
      conversationId: conversation.id,
      sender: 'ai',
      text: llmResponse.reply,
      isRead: false,
    });

    // Update conversation last activity
    await conversationRepository.updateLastActivity(conversation.id);

    return {
      success: true,
      reply: llmResponse.reply,
      sessionId: conversation.id,
      attachment: userMessage.attachments[0]
        ? {
            id: userMessage.attachments[0].id,
            fileName: userMessage.attachments[0].fileName,
            fileUrl: userMessage.attachments[0].fileUrl,
          }
        : undefined,
    };
  } catch (error) {
    console.error('Chat Service Error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

// Get conversation history for a session
export async function getHistory(sessionId: string) {
  const conversation = await conversationRepository.findByIdWithMessages(sessionId);

  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    status: conversation.status,
    createdAt: conversation.createdAt,
    messages: conversation.messages.map((msg: MessageWithAttachments) => ({
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      attachments: msg.attachments.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        fileUrl: att.fileUrl,
      })),
    })),
  };
}

// Mark a message as read
export async function markMessageAsRead(messageId: string) {
  const message = await messageRepository.findById(messageId);

  if (!message) {
    return { success: false, error: 'Message not found' };
  }

  if (message.isRead) {
    return { success: true, alreadyRead: true };
  }

  await messageRepository.markAsRead(messageId);
  return { success: true, alreadyRead: false };
}

// Mark all AI messages in a conversation as read
export async function markAllAiMessagesAsRead(sessionId: string) {
  await messageRepository.markAllAiMessagesAsRead(sessionId);
  return { success: true };
}

// Get conversation status for auto-close polling
export async function getConversationStatus(
  sessionId: string
): Promise<ConversationStatusResult | null> {
  const conversation = await conversationRepository.findByIdWithLastAiMessage(sessionId);

  if (!conversation) {
    return null;
  }

  const lastAiMessage = conversation.messages[0];
  const inactivityWarningMs = parseInt(process.env.INACTIVITY_WARNING_MS || '120000');
  const inactivityCloseMs = parseInt(process.env.INACTIVITY_CLOSE_MS || '60000');

  // If no AI message or conversation is closed, return basic status
  if (!lastAiMessage || conversation.status === 'closed') {
    return {
      status: conversation.status as ConversationStatus,
      warningIssued: false,
    };
  }

  // If last AI message hasn't been read, no countdown
  if (!lastAiMessage.isRead || !lastAiMessage.readAt) {
    return {
      status: conversation.status as ConversationStatus,
      warningIssued: false,
    };
  }

  const now = Date.now();
  const readAt = lastAiMessage.readAt.getTime();
  const timeSinceRead = now - readAt;

  // Calculate time until warning and close
  const timeUntilWarning = Math.max(0, inactivityWarningMs - timeSinceRead);
  const timeUntilClose = Math.max(
    0,
    inactivityWarningMs + inactivityCloseMs - timeSinceRead
  );
  const warningIssued = timeSinceRead >= inactivityWarningMs;

  return {
    status: conversation.status as ConversationStatus,
    warningIssued,
    timeUntilWarning,
    timeUntilClose,
    lastAiMessageReadAt: lastAiMessage.readAt,
  };
}

// Close a conversation
export async function closeConversation(sessionId: string) {
  const conversation = await conversationRepository.updateStatus(sessionId, 'closed', new Date());

  // Add system message about closure
  await messageRepository.create({
    conversationId: sessionId,
    sender: 'ai',
    text: CONVERSATION_CLOSED_MESSAGE,
    isRead: false,
  });

  return conversation;
}

// Send warning message
export async function sendWarningMessage(sessionId: string) {
  await messageRepository.create({
    conversationId: sessionId,
    sender: 'ai',
    text: CONVERSATION_WARNING_MESSAGE,
    isRead: false,
  });

  return { success: true };
}

// Reopen a conversation
export async function reopenConversation(sessionId: string) {
  const conversation = await conversationRepository.findByIdWithMessages(sessionId);

  if (!conversation) {
    return { success: false, error: 'Conversation not found' };
  }

  if (conversation.status !== 'closed') {
    return { success: false, error: 'Conversation is not closed' };
  }

  // Generate summary of previous conversation
  const historyForSummary = conversation.messages
    .filter((msg: MessageWithAttachments) => !msg.text.includes('closed due to inactivity'))
    .map((msg: MessageWithAttachments) => ({
      sender: msg.sender as 'user' | 'ai',
      text: msg.text,
    }));

  const summaryResult = await generateConversationSummary(historyForSummary);
  const summary = summaryResult.success
    ? summaryResult.reply
    : 'Unable to generate summary of previous conversation.';

  // Reopen conversation
  await conversationRepository.updateStatus(sessionId, 'open', null);

  // Add reopened message with summary
  const reopenMessage = await messageRepository.create({
    conversationId: sessionId,
    sender: 'ai',
    text: CONVERSATION_REOPENED_MESSAGE(summary || ''),
    isRead: false,
  });

  return {
    success: true,
    summary,
    message: reopenMessage,
  };
}
