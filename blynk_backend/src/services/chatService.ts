import { prisma } from '../utils/prisma';
import { MessageType, SenderType } from '@prisma/client';
import { eventEmitter } from '../sse/eventEmitter';
import { notificationService } from './notificationService';

export class ChatService {
  async createMessage(data: {
    sessionId: string;
    senderType: SenderType;
    textKo?: string;
    textVn?: string;
    textEn?: string;
    messageType: MessageType;
    imageUrl?: string;
    metadata?: any;
  }) {
    const message = await prisma.chatMessage.create({
      data,
      include: {
        session: {
          include: {
            table: true,
          },
        },
      },
    });

    // Emit SSE event
    const text = data.textKo || data.textVn || data.textEn || '';
    await eventEmitter.publishChatMessage(
      data.sessionId,
      data.senderType,
      text,
      data.messageType,
      data.imageUrl
    );

    // If message is from user, notify staff
    if (data.senderType === 'USER') {
      const tableNumber = message.session.table?.tableNumber || 0;
      
      // Don't publish chat:new SSE event for ORDER type messages
      // ORDER_NEW notification is already handled by orderService
      if (data.messageType !== 'ORDER') {
        await eventEmitter.publishNewChat(
          message.session.restaurantId,
          data.sessionId,
          message.session.tableId,
          tableNumber,
          text,
          'user',
          data.messageType
        );
      }

      // Create notification for new chat message
      if (data.messageType === 'REQUEST') {
        // Customer request notification (all requests including water requests)
        const requestTextKo = data.textKo || '';
        const requestTextVn = data.textVn || '';
        const requestTextEn = data.textEn || '';
        
        await notificationService.createNotification({
          restaurantId: message.session.restaurantId,
          type: 'CUSTOMER_REQUEST',
          titleKo: '고객 요청',
          titleVn: 'Yêu cầu khách hàng',
          titleEn: 'Customer Request',
          descriptionKo: `테이블 ${tableNumber}에서 요청: ${requestTextKo}`,
          descriptionVn: `Bàn ${tableNumber} yêu cầu: ${requestTextVn}`,
          descriptionEn: `Table ${tableNumber} request: ${requestTextEn}`,
          metadata: {
            sessionId: data.sessionId,
            tableId: message.session.tableId,
            tableNumber: tableNumber,
            messageId: message.id,
            requestText: text,
            requestTextKo: requestTextKo,
            requestTextVn: requestTextVn,
            requestTextEn: requestTextEn,
          },
        });
      } else if (data.messageType === 'ORDER') {
        // ORDER type messages don't need CHAT_NEW notification
        // because ORDER_NEW notification is already created by orderService
        // Skip notification creation for ORDER type messages
      } else {
        // Regular chat message notification (TEXT, IMAGE types)
        await notificationService.createNotification({
          restaurantId: message.session.restaurantId,
          type: 'CHAT_NEW',
          titleKo: '새 메시지',
          titleVn: 'Tin nhắn mới',
          titleEn: 'New Message',
          descriptionKo: `테이블 ${tableNumber}에서 새 메시지`,
          descriptionVn: `Bàn ${tableNumber} có tin nhắn mới`,
          descriptionEn: `Table ${tableNumber} sent a new message`,
          metadata: {
            sessionId: data.sessionId,
            tableId: message.session.tableId,
            tableNumber: tableNumber,
            messageId: message.id,
          },
        });
      }
    }

    return message;
  }

  async getChatHistory(sessionId: string) {
    return prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const chatService = new ChatService();
