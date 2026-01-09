import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { SessionStatus } from '@prisma/client';

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

    // Update table current session
    await prisma.table.update({
      where: { id: data.tableId },
      data: { currentSessionId: session.id },
    });

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
