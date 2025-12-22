import { Request, Response, NextFunction } from 'express';
import * as chatService from '../services/chat.service';
import { SendMessageInput } from '../middleware/validation';

// POST /chat/message - Send a message and get AI response
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as SendMessageInput;
    const file = req.file;

    const result = await chatService.sendMessage({
      message:body.message,
      sessionId:body.sessionId,
      file: file
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          }
        : undefined,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        sessionId: result.sessionId,
      });
      return;
    }

    res.status(200).json({
      success: true,
      reply: result.reply,
      sessionId: result.sessionId,
      attachment: result.attachment,
    });
  } catch (error) {
    next(error);
  }
}

// GET /chat/history/:sessionId - Get conversation history
export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    const history = await chatService.getHistory(sessionId);

    if (!history) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /chat/read/:messageId - Mark a message as read
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { messageId } = req.params;

    const result = await chatService.markMessageAsRead(messageId);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      alreadyRead: result.alreadyRead,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /chat/read-all/:sessionId - Mark all AI messages as read
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    await chatService.markAllAiMessagesAsRead(sessionId);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

// GET /chat/status/:sessionId - Get conversation status for auto-close polling
export async function getStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    const status = await chatService.getConversationStatus(sessionId);

    if (!status) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /chat/reopen/:sessionId - Reopen a closed conversation
export async function reopenConversation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    const result = await chatService.reopenConversation(sessionId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      summary: result.summary,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// POST /chat/close/:sessionId - Manually close a conversation
export async function closeConversation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;

    const conversation = await chatService.closeConversation(sessionId);

    res.status(200).json({
      success: true,
      data: {
        id: conversation.id,
        status: conversation.status,
        closedAt: conversation.closedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
