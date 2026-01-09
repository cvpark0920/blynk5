import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService';
import { createError } from '../middleware/errorHandler';
import { SenderType, MessageType } from '@prisma/client';

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, senderType, textKo, textVn, textEn, messageType, imageUrl, metadata } = req.body;

    if (!sessionId || !senderType || !messageType) {
      throw createError('Session ID, sender type, and message type are required', 400);
    }

    const message = await chatService.createMessage({
      sessionId,
      senderType: senderType as SenderType,
      textKo,
      textVn,
      textEn,
      messageType: messageType as MessageType,
      imageUrl,
      metadata,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const messages = await chatService.getChatHistory(sessionId);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};
