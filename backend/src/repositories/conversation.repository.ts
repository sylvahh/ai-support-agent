import prisma from '../config/database';

export interface ConversationWithMessages {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  closedAt: Date | null;
  messages: MessageWithAttachments[];
}

export interface MessageWithAttachments {
  id: string;
  conversationId: string;
  sender: string;
  text: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  cloudinaryPublicId: string | null;
  fileSize: number | null;
  createdAt: Date;
}

export const conversationRepository = {
  async findById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
    });
  },

  async findByIdWithMessages(id: string): Promise<ConversationWithMessages | null> {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { attachments: true },
        },
      },
    }) as Promise<ConversationWithMessages | null>;
  },

  async findByIdWithLastAiMessage(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          where: { sender: 'ai' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  },

  async create() {
    return prisma.conversation.create({
      data: {},
    });
  },

  async updateStatus(id: string, status: 'open' | 'closed', closedAt?: Date | null) {
    return prisma.conversation.update({
      where: { id },
      data: {
        status,
        closedAt: closedAt !== undefined ? closedAt : undefined,
        lastActivityAt: new Date(),
      },
    });
  },

  async updateLastActivity(id: string) {
    return prisma.conversation.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  },

  async findOpenConversationsWithReadAiMessages() {
    return prisma.conversation.findMany({
      where: {
        status: 'open',
      },
      include: {
        messages: {
          where: {
            sender: 'ai',
            isRead: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  },
};
