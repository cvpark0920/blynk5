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

    // Get current table status
    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
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
    }

    const updatedTable = await prisma.table.update({
      where: { id: data.tableId },
      data: updateData,
    });

    // Emit SSE event for table status change if status was changed
    if (updateData.status) {
      await eventEmitter.publishTableStatusChanged(
        data.restaurantId,
        data.tableId,
        updateData.status,
        session.id
      );
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

    return session;
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
