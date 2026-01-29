import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { SessionStatus, TableStatus } from '@prisma/client';
import { eventEmitter } from '../sse/eventEmitter';

export class SessionService {
  async createSession(data: {
    tableId: string;
    restaurantId: string;
    guestCount: number;
  }) {
    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
    });

    if (!table) {
      throw createError('Table not found', 404);
    }

    if (table.isActive === false) {
      throw createError('Table is inactive', 400);
    }

    // Check if table already has an active session
    const existingSession = await prisma.session.findFirst({
      where: {
        tableId: data.tableId,
        status: SessionStatus.ACTIVE,
      },
    });

    if (existingSession) {
      return existingSession;
    }

    const session = await prisma.session.create({
      data: {
        ...data,
        status: SessionStatus.ACTIVE,
      },
      include: {
        table: true,
        restaurant: true,
      },
    });

    // Update table: set current session and status
    // If table is EMPTY and guestCount > 0, automatically change status to ORDERING
    // Note: guestCount is stored in Session, not Table
    const updateData: any = {
      currentSessionId: session.id,
    };

    // If table is EMPTY and guestCount > 0, change status to ORDERING
    if (table && table.status === TableStatus.EMPTY && data.guestCount > 0) {
      updateData.status = TableStatus.ORDERING;
      console.log(`[SessionService] createSession - Updating table status from EMPTY to ORDERING`, {
        tableId: data.tableId,
        tableNumber: table.tableNumber,
        guestCount: data.guestCount,
        restaurantId: data.restaurantId,
      });
    }

    const updatedTable = await prisma.table.update({
      where: { id: data.tableId },
      data: updateData,
    });

    // Emit SSE event for table status change if status was changed
    if (updateData.status) {
      console.log(`[SessionService] createSession - Publishing table:status-changed SSE event`, {
        restaurantId: data.restaurantId,
        tableId: data.tableId,
        tableNumber: table.tableNumber,
        status: updateData.status,
        sessionId: session.id,
      });
      await eventEmitter.publishTableStatusChanged(
        data.restaurantId,
        data.tableId,
        updateData.status,
        session.id
      );
      console.log(`[SessionService] createSession - SSE event published successfully`);
    } else {
      console.log(`[SessionService] createSession - No status change, skipping SSE event`, {
        tableId: data.tableId,
        tableStatus: table.status,
        guestCount: data.guestCount,
      });
    }

    return session;
  }

  async getSessionById(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        table: true,
        restaurant: true,
        orders: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
        chatMessages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw createError('Session not found', 404);
    }

    // 기존 메시지의 metadata에 selectedOptions가 없는 경우 주문 정보를 조회해서 보강
    const enrichedMessages = await Promise.all(
      session.chatMessages.map(async (message) => {
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
          const needsEnrichment = items.some(
            (item: any) => !item.selectedOptions || !Array.isArray(item.selectedOptions) || item.selectedOptions.length === 0
          );

          if (needsEnrichment) {
            // session.orders에서 해당 주문 찾기
            const order = session.orders.find((o) => o.id === orderId);

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
          }
        }

        return message;
      })
    );

    return {
      ...session,
      chatMessages: enrichedMessages,
    };
  }

  async updateSessionGuestCount(sessionId: string, guestCount: number) {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { guestCount },
      include: {
        table: true,
        restaurant: true,
      },
    });

    return session;
  }

  async updateOrCreateSessionForTable(data: {
    tableId: string;
    restaurantId: string;
    guestCount: number;
  }) {
    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
    });

    if (!table) {
      throw createError('Table not found', 404);
    }

    if (table.isActive === false) {
      throw createError('Table is inactive', 400);
    }

    // Check if table already has an active session
    const existingSession = await prisma.session.findFirst({
      where: {
        tableId: data.tableId,
        status: SessionStatus.ACTIVE,
      },
    });

    if (existingSession) {
      // Update existing session's guest count
      return this.updateSessionGuestCount(existingSession.id, data.guestCount);
    }

    // Create new session
    return this.createSession(data);
  }

  async endSession(id: string) {
    const session = await prisma.session.update({
      where: { id },
      data: {
        status: SessionStatus.ENDED,
        endedAt: new Date(),
      },
    });

    // Clear table current session
    await prisma.table.update({
      where: { id: session.tableId },
      data: { currentSessionId: null },
    });

    return session;
  }
}

export const sessionService = new SessionService();
