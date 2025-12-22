import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { upload } from '../middleware/upload';
import {
  validateBody,
  validateParams,
  validateFileUpload,
  sendMessageSchema,
  sessionIdParamSchema,
  messageIdParamSchema,
} from '../middleware/validation';

const router = Router();

// POST /chat/message - Send a message (with optional file attachment)
router.post(
  '/message',
  upload.single('file'),
  validateFileUpload,
  validateBody(sendMessageSchema),
  chatController.sendMessage
);

// GET /chat/history/:sessionId - Get conversation history
router.get(
  '/history/:sessionId',
  validateParams(sessionIdParamSchema),
  chatController.getHistory
);

// PATCH /chat/read/:messageId - Mark a single message as read
router.patch(
  '/read/:messageId',
  validateParams(messageIdParamSchema),
  chatController.markAsRead
);

// PATCH /chat/read-all/:sessionId - Mark all AI messages in conversation as read
router.patch(
  '/read-all/:sessionId',
  validateParams(sessionIdParamSchema),
  chatController.markAllAsRead
);

// GET /chat/status/:sessionId - Get conversation status (for auto-close polling)
router.get(
  '/status/:sessionId',
  validateParams(sessionIdParamSchema),
  chatController.getStatus
);

// PATCH /chat/reopen/:sessionId - Reopen a closed conversation
router.patch(
  '/reopen/:sessionId',
  validateParams(sessionIdParamSchema),
  chatController.reopenConversation
);

// POST /chat/close/:sessionId - Manually close a conversation
router.post(
  '/close/:sessionId',
  validateParams(sessionIdParamSchema),
  chatController.closeConversation
);

export default router;
