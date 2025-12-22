import cron from 'node-cron';
import prisma from '../config/database';
import * as chatService from '../services/chat.service';

const INACTIVITY_WARNING_MS = parseInt(process.env.INACTIVITY_WARNING_MS || '120000');
const INACTIVITY_CLOSE_MS = parseInt(process.env.INACTIVITY_CLOSE_MS || '60000');

interface ConversationToProcess {
  id: string;
  lastAiMessageReadAt: Date;
  hasReceivedWarning: boolean;
}

// Track which conversations have received warnings (in-memory for simplicity)
const warningsSent = new Map<string, Date>();

async function processInactiveConversations() {
  try {
    // Find all open conversations with read AI messages
    const openConversations = await prisma.conversation.findMany({
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

    const now = Date.now();

    for (const conversation of openConversations) {
      const lastAiMessage = conversation.messages[0];

      // Skip if no read AI message
      if (!lastAiMessage || !lastAiMessage.readAt) {
        continue;
      }

      const readAt = lastAiMessage.readAt.getTime();
      const timeSinceRead = now - readAt;

      // Check if user has sent a message after the AI message was read
      const userMessageAfterAi = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          sender: 'user',
          createdAt: {
            gt: lastAiMessage.createdAt,
          },
        },
      });

      // If user replied, clear any warning and skip
      if (userMessageAfterAi) {
        warningsSent.delete(conversation.id);
        continue;
      }

      const warningSentAt = warningsSent.get(conversation.id);

      // Check if we need to close (warning was sent and additional time has passed)
      if (warningSentAt) {
        const timeSinceWarning = now - warningSentAt.getTime();

        if (timeSinceWarning >= INACTIVITY_CLOSE_MS) {
          // Close the conversation
          console.log(`Closing conversation ${conversation.id} due to inactivity`);
          await chatService.closeConversation(conversation.id);
          warningsSent.delete(conversation.id);
        }
      }
      // Check if we need to send warning
      else if (timeSinceRead >= INACTIVITY_WARNING_MS) {
        console.log(`Sending warning to conversation ${conversation.id}`);
        await chatService.sendWarningMessage(conversation.id);
        warningsSent.set(conversation.id, new Date());
      }
    }
  } catch (error) {
    console.error('Error processing inactive conversations:', error);
  }
}

// Run every 30 seconds
export function startConversationCloserJob() {
  console.log('Starting conversation auto-close job (runs every 30 seconds)');

  cron.schedule('*/30 * * * * *', async () => {
    await processInactiveConversations();
  });
}

// For manual testing
export { processInactiveConversations };
