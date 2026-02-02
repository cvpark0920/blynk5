import { Request, Response, NextFunction, RequestHandler } from 'express';
import { chatService } from '../services/chatService';
import { createError } from '../middleware/errorHandler';
import { SenderType, MessageType } from '@prisma/client';
import { AuthRequest, checkRestaurantAccess } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { eventEmitter } from '../sse/eventEmitter';
import { logger } from '../utils/logger';

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, senderType, textKo, textVn, textEn, textZh, textRu, messageType, imageUrl, metadata } = req.body;

    if (!sessionId || !senderType || !messageType) {
      throw createError('Session ID, sender type, and message type are required', 400);
    }

    const message = await chatService.createMessage({
      sessionId,
      senderType: senderType as SenderType,
      textKo,
      textVn,
      textEn,
      textZh,
      textRu,
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
    
    // 디버깅: API 응답 전 메시지 확인
    console.log(`[ChatController] getChatHistory - Session ID: ${sessionId}, Messages count: ${messages.length}`);
    messages.forEach((msg: any, idx: number) => {
      if (msg.metadata && typeof msg.metadata === 'object' && 'orderId' in msg.metadata) {
        const metadata = msg.metadata as { orderId: string; items?: any[] };
        console.log(`[ChatController] getChatHistory - Response message ${idx}:`, {
          messageId: msg.id,
          orderId: metadata.orderId,
          itemsCount: metadata.items?.length || 0,
          items: metadata.items?.map((item: any) => ({
            id: item.id,
            selectedOptionsLength: item.selectedOptions?.length || 0,
            selectedOptions: item.selectedOptions,
          })),
        });
      }
    });
    
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

export const getChatReadStatus: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }
    const sessionIdsParam = req.query.sessionIds;
    if (!sessionIdsParam || typeof sessionIdsParam !== 'string') {
      throw createError('sessionIds is required', 400);
    }
    const sessionIds = sessionIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (sessionIds.length === 0) {
      throw createError('sessionIds is required', 400);
    }

    const rows = await prisma.chatReadStatus.findMany({
      where: {
        userId: authReq.user.userId,
        sessionId: { in: sessionIds },
      },
      select: {
        sessionId: true,
        lastReadMessageId: true,
      },
    });

    const map: Record<string, string> = {};
    rows.forEach((row) => {
      map[row.sessionId] = row.lastReadMessageId;
    });

    res.json({ success: true, data: map });
  } catch (error) {
    next(error);
  }
};

export const markChatRead: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }
    const { sessionId } = req.params;
    const { lastReadMessageId } = req.body;
    if (!sessionId) {
      throw createError('Session ID is required', 400);
    }
    if (!lastReadMessageId || typeof lastReadMessageId !== 'string') {
      throw createError('lastReadMessageId is required', 400);
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { restaurantId: true },
    });
    if (!session) {
      throw createError('Session not found', 404);
    }

    const access = await checkRestaurantAccess(authReq.user.userId, session.restaurantId);
    if (!access.hasAccess) {
      throw createError('Insufficient permissions', 403);
    }

    await prisma.chatReadStatus.upsert({
      where: {
        userId_sessionId: {
          userId: authReq.user.userId,
          sessionId,
        },
      },
      update: {
        lastReadMessageId,
      },
      create: {
        userId: authReq.user.userId,
        staffId: authReq.user.staffId || null,
        sessionId,
        restaurantId: session.restaurantId,
        lastReadMessageId,
      },
    });

    // Broadcast chat:read event to all staff devices in the restaurant
    // This allows other devices to update their unread chat counts in real-time
    const eventData = {
      type: 'chat:read',
      sessionId,
      userId: authReq.user.userId,
      lastReadMessageId,
    };
    logger.info('Broadcasting chat:read event', { 
      restaurantId: session.restaurantId, 
      sessionId, 
      userId: authReq.user.userId,
      lastReadMessageId 
    });
    await eventEmitter.publish(`sse:restaurant:${session.restaurantId}:staff`, eventData);

    res.json({ success: true, data: true });
  } catch (error) {
    next(error);
  }
};
