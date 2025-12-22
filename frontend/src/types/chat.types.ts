export type MessageSender = "user" | "ai";

export type ConversationStatus = "open" | "closed";

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
}

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  isRead: boolean;
  createdAt: string;
  attachments: Attachment[];
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  createdAt: string;
  messages: Message[];
}

export interface SendMessageResponse {
  success: boolean;
  reply?: string;
  sessionId?: string;
  attachment?: Attachment;
  error?: string;
}

export interface GetHistoryResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

export interface ConversationStatusResponse {
  success: boolean;
  data?: {
    status: ConversationStatus;
    warningIssued: boolean;
    timeUntilWarning?: number;
    timeUntilClose?: number;
    lastAiMessageReadAt?: string;
  };
  error?: string;
}

export interface ReopenResponse {
  success: boolean;
  summary?: string;
  message?: Message;
  error?: string;
}

export interface MarkReadResponse {
  success: boolean;
  alreadyRead?: boolean;
  error?: string;
}
