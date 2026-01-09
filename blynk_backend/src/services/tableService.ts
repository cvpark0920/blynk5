import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { TableStatus } from '@prisma/client';
import { eventEmitter } from '../sse/eventEmitter';
import { sessionService } from './sessionService';

export class TableService {
  async getTablesByRestaurant(restaurantId: string) {
    return prisma.table.findMany({
      where: { restaurantId },
      include: {
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            orders: {
              where: {
                status: {
                  in: ['PENDING', 'COOKING'],
                },
              },
            },
          },
          take: 1,
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: [
        { floor: 'asc' },
        { tableNumber: 'asc' },
      ],
    });
  }

  async getTableById(id: string) {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        restaurant: true,
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            orders: true,
          },
          take: 1,
        },
      },
    });

    if (!table) {
      throw createError('Table not found', 404);
    }

    return table;
  }

  async getTableByNumber(restaurantId: string, tableNumber: number) {
    const table = await prisma.table.findFirst({
      where: {
        restaurantId,
        tableNumber,
      },
      include: {
        restaurant: true,
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            orders: true,
          },
          take: 1,
        },
      },
    });

    if (!table) {
      throw createError('Table not found', 404);
    }

    return table;
  }

  async updateTableStatus(id: string, status: TableStatus) {
    // Get current table state to check for existing session
    const currentTable = await prisma.table.findUnique({
      where: { id },
      include: {
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
        },
      },
    });

    let endedSessionId: string | null = null;

    // If changing to CLEANING, end the active session first
    if (status === 'CLEANING') {
      if (currentTable && currentTable.sessions && currentTable.sessions.length > 0) {
        endedSessionId = currentTable.sessions[0].id;
        await sessionService.endSession(endedSessionId);
      }
    }

    // If changing to EMPTY, check if there's a currentSessionId that was ended
    // This handles the case where table goes from CLEANING to EMPTY (cleaning complete)
    if (status === 'EMPTY' && currentTable?.currentSessionId) {
      // Check if the session exists and is ended
      const session = await prisma.session.findUnique({
        where: { id: currentTable.currentSessionId },
      });
      if (session && session.status === 'ENDED') {
        endedSessionId = session.id;
      }
    }

    const table = await prisma.table.update({
      where: { id },
      data: { status },
      include: {
        restaurant: true,
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            orders: {
              where: {
                status: {
                  in: ['PENDING', 'COOKING'],
                },
              },
            },
          },
          take: 1,
        },
      },
    });

    // Emit SSE event for table status change
    await eventEmitter.publishTableStatusChanged(
      table.restaurantId,
      id,
      status,
      table.currentSessionId || undefined
    );

    // Emit session ended event if a session was ended
    if (endedSessionId) {
      await eventEmitter.publishSessionEnded(endedSessionId);
    }

    return table;
  }

  async createTable(data: {
    restaurantId: string;
    tableNumber: number;
    floor: number;
    capacity: number;
    qrCode: string;
  }) {
    return prisma.table.create({
      data,
    });
  }

  async updateTable(id: string, data: {
    tableNumber?: number;
    floor?: number;
    capacity?: number;
  }) {
    const table = await prisma.table.findUnique({
      where: { id },
    });

    if (!table) {
      throw createError('Table not found', 404);
    }

    return prisma.table.update({
      where: { id },
      data,
    });
  }

  async deleteTable(id: string) {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        sessions: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!table) {
      throw createError('Table not found', 404);
    }

    // Check if table has active session
    if (table.sessions.length > 0) {
      throw createError('Cannot delete table with active session', 400);
    }

    return prisma.table.delete({
      where: { id },
    });
  }
}

export const tableService = new TableService();
