// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}

// Chat types
export interface ChatMessageInput {
  message: string;
  sessionId?: string;
}

export interface ChatMessageResponse {
  reply: string;
  sessionId: string;
  attachment?: AttachmentInfo;
}

export interface AttachmentInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
}

export interface ConversationHistory {
  id: string;
  status: 'open' | 'closed';
  createdAt: Date;
  messages: MessageInfo[];
}

export interface MessageInfo {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isRead: boolean;
  createdAt: Date;
  attachments: AttachmentInfo[];
}

export interface ConversationStatusInfo {
  status: 'open' | 'closed';
  warningIssued: boolean;
  timeUntilWarning?: number;
  timeUntilClose?: number;
  lastAiMessageReadAt?: Date;
}

// LLM types
export interface LLMMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface LLMAttachment {
  url: string;
  mimeType: string;
}
