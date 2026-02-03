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
    textZh?: string;
    textRu?: string;
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
    // rawText 결정: 제공된 언어 필드 중 빈 문자열이 아닌 값만 사용
    const getNonEmptyText = (text: string | undefined): string | null => {
      return text && text.trim() !== '' ? text.trim() : null;
    };
    
    // 제공된 언어 필드 확인 (원문 보존을 위해)
    const providedTextKo = getNonEmptyText(data.textKo);
    const providedTextVn = getNonEmptyText(data.textVn);
    const providedTextEn = getNonEmptyText(data.textEn);
    const providedTextZh = getNonEmptyText(data.textZh);
    const providedTextRu = getNonEmptyText(data.textRu);
    
    // 모든 언어 필드를 동일한 순서로 확인 (원래 순서 유지)
    const rawText = providedTextKo || 
                    providedTextVn || 
                    providedTextEn || 
                    providedTextZh || 
                    providedTextRu || 
                    '';
    
    // 제공된 언어 필드가 있으면 해당 언어를 원문 언어로 사용 (언어 감지보다 우선)
    // 모든 언어를 동일한 우선순위로 처리 (rawText 결정 순서와 동일)
    let originalLanguage: DetectedLanguage | null = null;
    if (providedTextKo) {
      originalLanguage = 'ko';
    } else if (providedTextVn) {
      originalLanguage = 'vn';
    } else if (providedTextEn) {
      originalLanguage = 'en';
    } else if (providedTextZh) {
      originalLanguage = 'zh';
    } else if (providedTextRu) {
      originalLanguage = 'ru';
    }
    
    const detectedLanguage =
      data.senderType === 'SYSTEM'
        ? null
        : originalLanguage || (rawText ? ((await detectLanguageWithDeepL(rawText)) || detectMessageLanguage(rawText)) : null);
    const shouldTranslateField = (value: string | undefined, sourceText: string) =>
      !value || value.trim() === '' || value === sourceText;

    // 제공된 언어 필드를 우선 보존 (언어 감지 결과와 관계없이)
    let textKo = providedTextKo || data.textKo;
    let textVn = providedTextVn || data.textVn;
    let textEn = providedTextEn || data.textEn;
    let textZh = providedTextZh || data.textZh;
    let textRu = providedTextRu || data.textRu;

    if (rawText && detectedLanguage && (data.messageType === 'TEXT' || data.messageType === 'REQUEST')) {
      // 원문 텍스트 결정: 제공된 언어 필드가 있으면 그것을 사용, 없으면 감지된 언어의 필드 사용
      const sourceText = originalLanguage
        ? (originalLanguage === 'ko' ? providedTextKo
          : originalLanguage === 'vn' ? providedTextVn
          : originalLanguage === 'zh' ? providedTextZh
          : originalLanguage === 'ru' ? providedTextRu
          : providedTextEn) || rawText
        : (detectedLanguage === 'ko'
          ? (providedTextKo || rawText)
          : detectedLanguage === 'vn'
          ? (providedTextVn || rawText)
          : detectedLanguage === 'zh'
          ? (providedTextZh || rawText)
          : detectedLanguage === 'ru'
          ? (providedTextRu || rawText)
          : detectedLanguage === 'en'
          ? (providedTextEn || rawText)
          : rawText);

      try {
        // 원문을 해당 언어 필드에 먼저 저장 (제공된 값이 있으면 반드시 보존)
        // 모든 언어에 동일한 로직 적용
        // 중요: 제공된 언어 필드는 절대 덮어쓰지 않음
        if (detectedLanguage === 'ko') {
          textKo = providedTextKo || sourceText;
        } else if (providedTextKo) {
          // 감지된 언어가 아니어도 제공된 값은 보존
          textKo = providedTextKo;
        }
        if (detectedLanguage === 'vn') {
          textVn = providedTextVn || sourceText;
        } else if (providedTextVn) {
          textVn = providedTextVn;
        }
        if (detectedLanguage === 'en') {
          textEn = providedTextEn || sourceText;
        } else if (providedTextEn) {
          textEn = providedTextEn;
        }
        if (detectedLanguage === 'zh') {
          textZh = providedTextZh || sourceText;
        } else if (providedTextZh) {
          // 감지된 언어가 아니어도 제공된 값은 보존
          textZh = providedTextZh;
        }
        if (detectedLanguage === 'ru') {
          textRu = providedTextRu || sourceText;
        } else if (providedTextRu) {
          // 감지된 언어가 아니어도 제공된 값은 보존
          textRu = providedTextRu;
        }

        // 다른 모든 언어로 자동 번역 (원문 언어가 아닌 경우에만)
        // 중요: 제공된 언어 필드는 절대 덮어쓰지 않음 (원문 보존)
        if (detectedLanguage !== 'ko' && shouldTranslateField(textKo, sourceText) && !providedTextKo) {
          textKo = (await translateText(sourceText, 'ko', detectedLanguage as DetectedLanguage)) || textKo;
        }
        if (detectedLanguage !== 'vn' && shouldTranslateField(textVn, sourceText) && !providedTextVn) {
          textVn = (await translateText(sourceText, 'vn', detectedLanguage as DetectedLanguage)) || textVn;
        }
        if (detectedLanguage !== 'en' && shouldTranslateField(textEn, sourceText) && !providedTextEn) {
          textEn = (await translateText(sourceText, 'en', detectedLanguage as DetectedLanguage)) || textEn;
        }
        if (detectedLanguage !== 'zh' && shouldTranslateField(textZh, sourceText) && !providedTextZh) {
          textZh = (await translateText(sourceText, 'zh', detectedLanguage as DetectedLanguage)) || textZh;
        }
        if (detectedLanguage !== 'ru' && shouldTranslateField(textRu, sourceText) && !providedTextRu) {
          textRu = (await translateText(sourceText, 'ru', detectedLanguage as DetectedLanguage)) || textRu;
        }
      } catch (_error) {
        // Ignore translation errors and save original fields only.
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        senderType: data.senderType,
        textKo,
        textVn,
        textEn,
        textZh,
        textRu,
        detectedLanguage: detectedLanguage || null,
        messageType: data.messageType,
        imageUrl: data.imageUrl || null,
        metadata: data.metadata || {},
      },
      include: {
        session: {
          include: {
            table: true,
          },
        },
      },
    });
    
    // 디버깅: 저장된 메시지의 언어 필드 확인 (중국어/러시아어 추적)
    console.log(`[ChatService] createMessage - 저장된 메시지 언어 필드:`, {
      messageId: message.id,
      sessionId: data.sessionId,
      senderType: data.senderType,
      detectedLanguage: message.detectedLanguage,
      textKo: message.textKo ? `${message.textKo.substring(0, 20)}...` : null,
      textVn: message.textVn ? `${message.textVn.substring(0, 20)}...` : null,
      textEn: message.textEn ? `${message.textEn.substring(0, 20)}...` : null,
      textZh: message.textZh ? `${message.textZh.substring(0, 20)}...` : null,
      textRu: message.textRu ? `${message.textRu.substring(0, 20)}...` : null,
      providedTextZh: providedTextZh ? `${providedTextZh.substring(0, 20)}...` : null,
      providedTextRu: providedTextRu ? `${providedTextRu.substring(0, 20)}...` : null,
      originalLanguage,
      messageKeys: Object.keys(message),
      messageTextRuDirect: (message as any).textRu,
      messageTextZhDirect: (message as any).textZh,
      savedTextRu: textRu ? `${textRu.substring(0, 20)}...` : null,
      savedTextZh: textZh ? `${textZh.substring(0, 20)}...` : null,
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
    const text = data.textKo || data.textVn || data.textEn || data.textZh || data.textRu || '';
    await eventEmitter.publishChatMessage(
      data.sessionId,
      data.senderType,
      text,
      data.messageType,
      data.imageUrl
    );

    // If message is from user, notify staff
    if (data.senderType === 'USER' && message.session) {
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
    
    // 디버깅: 조회된 메시지의 언어 필드 확인 (중국어/러시아어 추적)
    console.log(`[ChatService] getChatHistory - 조회된 메시지 언어 필드 (Session: ${sessionId}, Count: ${messages.length}):`);
    messages.forEach((msg: any, idx: number) => {
      // 중국어/러시아어 필드가 있는 메시지만 로그 출력
      if (msg.textZh || msg.textRu || msg.detectedLanguage === 'zh' || msg.detectedLanguage === 'ru') {
        console.log(`[ChatService] getChatHistory - Message ${idx} (ID: ${msg.id}):`, {
          messageId: msg.id,
          detectedLanguage: msg.detectedLanguage,
          textKo: msg.textKo ? `${msg.textKo.substring(0, 30)}...` : null,
          textVn: msg.textVn ? `${msg.textVn.substring(0, 30)}...` : null,
          textEn: msg.textEn ? `${msg.textEn.substring(0, 30)}...` : null,
          textZh: msg.textZh ? `${msg.textZh.substring(0, 30)}...` : null,
          textRu: msg.textRu ? `${msg.textRu.substring(0, 30)}...` : null,
          senderType: msg.senderType,
          messageType: msg.messageType,
        });
      }
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
