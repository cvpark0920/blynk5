import { prisma } from '../utils/prisma';
import { MessageType, SenderType } from '@prisma/client';
import { eventEmitter } from '../sse/eventEmitter';
import { notificationService } from './notificationService';
import { detectMessageLanguage, DetectedLanguage } from '../utils/languageDetector';
import { detectLanguageWithDeepL, translateText } from './translationService';

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
    // 디버깅: 채팅 메시지 생성 시점의 metadata 확인
    if (data.metadata && typeof data.metadata === 'object' && 'orderId' in data.metadata && 'items' in data.metadata) {
      const metadata = data.metadata as any;
      if (Array.isArray(metadata.items)) {
        console.log(`[ChatService] createMessage - Order ID: ${metadata.orderId}`);
        console.log(`[ChatService] createMessage - Items count: ${metadata.items.length}`);
        metadata.items.forEach((item: any, idx: number) => {
          console.log(`[ChatService] createMessage - Item ${idx}:`, {
            id: item.id,
            menuItemId: item.menuItemId,
            nameKO: item.nameKO,
            quantity: item.quantity,
            selectedOptionsLength: item.selectedOptions?.length || 0,
            selectedOptions: item.selectedOptions,
          });
        });
      }
    }
    const rawText = data.textKo || data.textVn || data.textEn || '';
    const detectedLanguage =
      data.senderType === 'SYSTEM'
        ? null
        : (await detectLanguageWithDeepL(rawText)) || detectMessageLanguage(rawText);
    const shouldTranslateField = (value: string | undefined, sourceText: string) =>
      !value || value.trim() === '' || value === sourceText;

    let textKo = data.textKo;
    let textVn = data.textVn;
    let textEn = data.textEn;

    if (rawText && detectedLanguage && (data.messageType === 'TEXT' || data.messageType === 'REQUEST')) {
      const sourceText =
        detectedLanguage === 'ko'
          ? data.textKo || rawText
          : detectedLanguage === 'vn'
          ? data.textVn || rawText
          : data.textEn || rawText;

      try {
        if (detectedLanguage === 'ko' && shouldTranslateField(textKo, sourceText)) {
          textKo = sourceText;
        }
        if (detectedLanguage === 'vn' && shouldTranslateField(textVn, sourceText)) {
          textVn = sourceText;
        }
        if (detectedLanguage === 'en' && shouldTranslateField(textEn, sourceText)) {
          textEn = sourceText;
        }

        if (detectedLanguage !== 'ko' && shouldTranslateField(textKo, sourceText)) {
          textKo = (await translateText(sourceText, 'ko', detectedLanguage as DetectedLanguage)) || textKo;
        }
        if (detectedLanguage !== 'vn' && shouldTranslateField(textVn, sourceText)) {
          textVn = (await translateText(sourceText, 'vn', detectedLanguage as DetectedLanguage)) || textVn;
        }
        if (detectedLanguage !== 'en' && shouldTranslateField(textEn, sourceText)) {
          textEn = (await translateText(sourceText, 'en', detectedLanguage as DetectedLanguage)) || textEn;
        }
      } catch (_error) {
        // Ignore translation errors and save original fields only.
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        ...data,
        textKo,
        textVn,
        textEn,
        detectedLanguage,
      },
      include: {
        session: {
          include: {
            table: true,
          },
        },
      },
    });
    
    // 디버깅: 저장된 메시지의 metadata 확인
    if (message.metadata && typeof message.metadata === 'object' && 'orderId' in message.metadata) {
      console.log(`[ChatService] createMessage - Saved message ID: ${message.id}`);
      console.log(`[ChatService] createMessage - Saved metadata:`, JSON.stringify(message.metadata, null, 2));
      if (message.metadata.items && Array.isArray(message.metadata.items)) {
        message.metadata.items.forEach((item: any, idx: number) => {
          console.log(`[ChatService] createMessage - Saved item ${idx}:`, {
            id: item.id,
            selectedOptionsLength: item.selectedOptions?.length || 0,
            selectedOptions: item.selectedOptions,
          });
        });
      }
    }

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
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    
    // 디버깅: 조회된 메시지의 metadata 확인
    messages.forEach((msg: any, idx: number) => {
      if (msg.metadata && typeof msg.metadata === 'object' && 'orderId' in msg.metadata) {
        const metadata = msg.metadata as { orderId: string; items?: any[] };
        console.log(`[ChatService] getChatHistory - Message ${idx} (ID: ${msg.id}):`, {
          orderId: metadata.orderId,
          itemsCount: metadata.items?.length || 0,
          items: metadata.items?.map((item: any) => ({
            id: item.id,
            nameKO: item.nameKO,
            selectedOptionsLength: item.selectedOptions?.length || 0,
            selectedOptions: item.selectedOptions,
          })),
        });
      }
    });

    // 기존 메시지의 metadata에 selectedOptions가 없는 경우 주문 정보를 조회해서 보강
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        // metadata에 orderId가 있고 items가 있지만 selectedOptions가 없는 경우 처리
        if (
          message.metadata &&
          typeof message.metadata === 'object' &&
          'orderId' in message.metadata &&
          'items' in message.metadata &&
          Array.isArray(message.metadata.items)
        ) {
          const orderId = message.metadata.orderId as string;
          const items = message.metadata.items as any[];

          // items에 selectedOptions가 없거나 빈 배열인 경우 주문을 조회해서 보강
          // 주문을 조회해서 실제로 옵션이 있는지 확인하고 보강
          const needsEnrichment = items.some(
            (item: any) => !item.selectedOptions || !Array.isArray(item.selectedOptions) || item.selectedOptions.length === 0
          );

          if (needsEnrichment) {
            try {
              const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: {
                  items: {
                    include: {
                      menuItem: true,
                      options: {
                        include: {
                          option: true,
                        },
                      },
                    },
                  },
                },
              });

              if (order) {
                // items를 order.items와 매칭해서 selectedOptions 추가
                const enrichedItems = items.map((item: any) => {
                  const orderItem = order.items.find((oi) => oi.id === item.id || oi.menuItemId === item.menuItemId);
                  // orderItem이 있고, orderItem에 options가 있는 경우에만 보강
                  if (orderItem && orderItem.options && orderItem.options.length > 0) {
                    // 기존 selectedOptions가 없거나 빈 배열인 경우에만 보강
                    if (!item.selectedOptions || !Array.isArray(item.selectedOptions) || item.selectedOptions.length === 0) {
                      return {
                        ...item,
                        selectedOptions: orderItem.options.map((opt) => ({
                          id: opt.option.id,
                          labelKO: opt.option.nameKo,
                          labelVN: opt.option.nameVn,
                          labelEN: opt.option.nameEn,
                          priceVND: opt.price,
                        })),
                      };
                    }
                  }
                  return item;
                });

                return {
                  ...message,
                  metadata: {
                    ...message.metadata,
                    items: enrichedItems,
                  },
                };
              }
            } catch (error) {
              // 주문 조회 실패 시 원본 메시지 반환
              console.error(`Failed to enrich message ${message.id} with order ${orderId}:`, error);
            }
          }
        }

        return message;
      })
    );

    return enrichedMessages;
  }
}

export const chatService = new ChatService();
