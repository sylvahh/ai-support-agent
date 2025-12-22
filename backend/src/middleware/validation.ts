import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Max message length (default 8000 chars ~1500 words for cost control)
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '8000');

// Validation schemas
export const sendMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Your message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters (approximately ${Math.floor(MAX_MESSAGE_LENGTH / 5)} words).`)
    .transform((val) => val.trim()),
  sessionId: z.string().uuid().optional(),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

export const messageIdParamSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
});

// Type exports
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;
export type MessageIdParam = z.infer<typeof messageIdParamSchema>;

// Validation middleware factory
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Return the first error message directly for cleaner UX
      const firstError = result.error.issues[0];

      res.status(400).json({
        success: false,
        error: firstError.message,
        message: firstError.message, // Include both for compatibility
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    next();
  };
}

// File validation
export function validateFileUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const file = req.file;

  if (file) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        error: `File type not supported. Allowed: ${allowedMimeTypes.join(', ')}`,
      });
      return;
    }

    if (file.size > maxFileSize) {
      res.status(400).json({
        success: false,
        error: `File too large. Maximum size: ${maxFileSize / (1024 * 1024)}MB`,
      });
      return;
    }
  }

  next();
}
