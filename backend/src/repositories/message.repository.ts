import prisma from '../config/database';

export interface CreateMessageInput {
  conversationId: string;
  sender: 'user' | 'ai';
  text: string;
  isRead?: boolean;
  readAt?: Date | null;
}

export interface CreateMessageWithAttachmentInput extends CreateMessageInput {
  attachment?: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    cloudinaryPublicId?: string;
    fileSize?: number;
  };
}

export const messageRepository = {
  async findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
    });
  },

  async findByConversationId(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { attachments: true },
    });
  },

  async create(input: CreateMessageInput) {
    return prisma.message.create({
      data: {
        conversationId: input.conversationId,
        sender: input.sender,
        text: input.text,
        isRead: input.isRead ?? false,
        readAt: input.readAt ?? null,
      },
    });
  },

  async createWithAttachment(input: CreateMessageWithAttachmentInput) {
    return prisma.message.create({
      data: {
        conversationId: input.conversationId,
        sender: input.sender,
        text: input.text,
        isRead: input.isRead ?? false,
        readAt: input.readAt ?? null,
        attachments: input.attachment
          ? {
              create: {
                fileName: input.attachment.fileName,
                fileType: input.attachment.fileType,
                fileUrl: input.attachment.fileUrl,
                cloudinaryPublicId: input.attachment.cloudinaryPublicId || null,
                fileSize: input.attachment.fileSize || null,
              },
            }
          : undefined,
      },
      include: { attachments: true },
    });
  },

  async markAsRead(id: string) {
    return prisma.message.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  async markAllAiMessagesAsRead(conversationId: string) {
    return prisma.message.updateMany({
      where: {
        conversationId,
        sender: 'ai',
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  async findUserMessageAfterDate(conversationId: string, afterDate: Date) {
    return prisma.message.findFirst({
      where: {
        conversationId,
        sender: 'user',
        createdAt: {
          gt: afterDate,
        },
      },
    });
  },
};
