import { redisPublisher } from '../utils/redis';
import { logger } from '../utils/logger';
import { pushService } from '../services/pushService';

export class EventEmitter {
  async publish(channel: string, event: {
    type: string;
    [key: string]: any;
  }) {
    try {
      const message = JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
      });

      // Publish to Redis with pattern matching
      await redisPublisher.publish(channel, message);
      logger.debug(`Published event to channel ${channel}:`, event.type);
    } catch (error: any) {
      logger.error(`Error publishing event to channel ${channel}`, { 
        error: error?.message || String(error),
        stack: error?.stack,
        channel 
      });
      throw error;
    }
  }

  // Helper methods for common events
  async publishOrderStatus(
    sessionId: string, 
    orderId: string, 
    status: string, 
    estimatedTime?: number,
    items?: Array<{
      id: string;
      quantity: number;
      menuItem: {
        id: string;
        nameKo: string;
        nameVn: string;
        nameEn?: string | null;
        imageUrl?: string | null;
      };
    }>
  ) {
    await this.publish(`sse:session:${sessionId}`, {
      type: 'order:status',
      orderId,
      status,
      estimatedTime,
      items,
    });
  }

  async publishChatMessage(sessionId: string, sender: string, text: string, messageType: string, imageUrl?: string) {
    await this.publish(`sse:session:${sessionId}`, {
      type: 'chat:message',
      sender,
      text,
      messageType,
      imageUrl,
    });
  }

  async publishNewOrder(
    restaurantId: string,
    orderId: string,
    tableId: string,
    tableNumber: number,
    items: any[],
    totalAmount: number
  ) {
    await this.publish(`sse:restaurant:${restaurantId}:staff`, {
      type: 'order:new',
      orderId,
      tableId,
      tableNumber,
      items,
      totalAmount,
      timestamp: new Date().toISOString(),
    });

    try {
      await pushService.sendToRestaurant(restaurantId, {
        title: '새 주문',
        body: `테이블 ${tableNumber}에서 새 주문이 들어왔습니다.`,
        url: '/shop',
      });
    } catch (error: any) {
      logger.error('Failed to send push for new order', {
        error: error?.message || String(error),
      });
    }
  }

  async publishOrderStatusChanged(
    restaurantId: string, 
    orderId: string, 
    status: string, 
    items?: Array<{
      id: string;
      quantity: number;
      menuItem: {
        id: string;
        nameKo: string;
        nameVn: string;
        nameEn?: string | null;
        imageUrl?: string | null;
      };
    }>,
    tableNumber?: number
  ) {
    await this.publish(`sse:restaurant:${restaurantId}:staff`, {
      type: 'order:status-changed',
      orderId,
      status,
      items,
      tableNumber,
      updatedAt: new Date().toISOString(),
    });
  }

  async publishTableStatusChanged(restaurantId: string, tableId: string, status: string, sessionId?: string) {
    await this.publish(`sse:restaurant:${restaurantId}:staff`, {
      type: 'table:status-changed',
      tableId,
      status,
      sessionId,
    });
  }

  async publishNewChat(restaurantId: string, sessionId: string, tableId: string, tableNumber: number, message: string, sender: string, messageType?: string) {
    await this.publish(`sse:restaurant:${restaurantId}:staff`, {
      type: 'chat:new',
      sessionId,
      tableId,
      tableNumber,
      message,
      sender,
      messageType,
    });

    if (sender === 'user') {
      const isRequest = messageType === 'REQUEST';
      const body = isRequest
        ? `테이블 ${tableNumber}에서 요청: ${message}`
        : `테이블 ${tableNumber}에서 새 메시지가 도착했습니다.`;
      try {
        await pushService.sendToRestaurant(restaurantId, {
          title: '새 채팅',
          body,
          url: '/shop',
        });
      } catch (error: any) {
        logger.error('Failed to send push for chat', {
          error: error?.message || String(error),
        });
      }
    }
  }

  async publishSessionEnded(sessionId: string) {
    await this.publish(`sse:session:${sessionId}`, {
      type: 'session:ended',
      sessionId,
    });
  }

  async publishPaymentConfirmed(restaurantId: string, sessionId: string, tableId: string, tableNumber: number, totalAmount: number, paymentMethod: string) {
    await this.publish(`sse:restaurant:${restaurantId}:staff`, {
      type: 'payment:confirmed',
      sessionId,
      tableId,
      tableNumber,
      totalAmount,
      paymentMethod,
      timestamp: new Date().toISOString(),
    });
  }
}

export const eventEmitter = new EventEmitter();
