import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { TableStatus } from '@prisma/client';
import { eventEmitter } from '../sse/eventEmitter';
import { sessionService } from './sessionService';
import { generateTableQRUrl } from '../utils/qrUrlGenerator';

export class TableService {
  async getTablesByRestaurant(restaurantId: string) {
    const tables = await prisma.table.findMany({
      where: { restaurantId },
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

    // Add qrCodeUrl to each table
    return tables.map(table => {
      try {
        const qrCodeUrl = generateTableQRUrl(table.restaurant, table.tableNumber);
        return {
          ...table,
          qrCodeUrl,
        };
      } catch (error) {
        // If subdomain is not configured, qrCodeUrl will be undefined
        return {
          ...table,
          qrCodeUrl: undefined,
        };
      }
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

    // Add qrCodeUrl
    try {
      const qrCodeUrl = generateTableQRUrl(table.restaurant, table.tableNumber);
      return {
        ...table,
        qrCodeUrl,
      };
    } catch (error) {
      // If subdomain is not configured, qrCodeUrl will be undefined
      return {
        ...table,
        qrCodeUrl: undefined,
      };
    }
  }

  async getTableByNumber(restaurantId: string, tableNumber: number) {
    const table = await prisma.table.findFirst({
      where: {
        restaurantId,
        tableNumber,
        isActive: true,
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

    // Add qrCodeUrl
    try {
      const qrCodeUrl = generateTableQRUrl(table.restaurant, table.tableNumber);
      return {
        ...table,
        qrCodeUrl,
      };
    } catch (error) {
      // If subdomain is not configured, qrCodeUrl will be undefined
      return {
        ...table,
        qrCodeUrl: undefined,
      };
    }
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

    if (currentTable && currentTable.isActive === false) {
      throw createError('Table is inactive', 400);
    }

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

    // Add qrCodeUrl
    let qrCodeUrl: string | undefined;
    try {
      qrCodeUrl = generateTableQRUrl(table.restaurant, table.tableNumber);
    } catch (error) {
      // If subdomain is not configured, qrCodeUrl will be undefined
      qrCodeUrl = undefined;
    }

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

    return { ...table, qrCodeUrl };
  }

  async createTable(data: {
    restaurantId: string;
    tableNumber: number;
    floor: number;
    capacity: number;
    qrCode: string;
  }) {
    const table = await prisma.table.create({
      data,
      include: {
        restaurant: true,
      },
    });

    // Add qrCodeUrl
    try {
      const qrCodeUrl = generateTableQRUrl(table.restaurant, table.tableNumber);
      return {
        ...table,
        qrCodeUrl,
      };
    } catch (error) {
      // If subdomain is not configured, qrCodeUrl will be undefined
      return {
        ...table,
        qrCodeUrl: undefined,
      };
    }
  }

  async updateTable(id: string, data: {
    tableNumber?: number;
    floor?: number;
    capacity?: number;
    isActive?: boolean;
  }) {
    const existingTable = await prisma.table.findUnique({
      where: { id },
      include: {
        restaurant: true,
      },
    });

    if (!existingTable) {
      throw createError('Table not found', 404);
    }

    const table = await prisma.table.update({
      where: { id },
      data,
      include: {
        restaurant: true,
      },
    });

    // Add qrCodeUrl (use updated tableNumber if changed)
    const tableNumber = data.tableNumber !== undefined ? data.tableNumber : table.tableNumber;
    try {
      const qrCodeUrl = generateTableQRUrl(table.restaurant, tableNumber);
      return {
        ...table,
        qrCodeUrl,
      };
    } catch (error) {
      // If subdomain is not configured, qrCodeUrl will be undefined
      return {
        ...table,
        qrCodeUrl: undefined,
      };
    }
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

  async resetTableToEmpty(id: string) {
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
        restaurant: true,
      },
    });

    if (!currentTable) {
      throw createError('Table not found', 404);
    }

    let endedSessionId: string | null = null;

    // If there's an active session, end it first
    if (currentTable.sessions && currentTable.sessions.length > 0) {
      endedSessionId = currentTable.sessions[0].id;
      await sessionService.endSession(endedSessionId);
    }

    // Cancel all non-paid orders for this table (PENDING, COOKING, SERVED)
    // This ensures that when a table is reset, old orders don't appear for new customers
    // Note: PAID orders are not cancelled as they are already completed transactions
    const cancelledOrders = await prisma.order.updateMany({
      where: {
        tableId: id,
        status: {
          in: ['PENDING', 'COOKING', 'SERVED'], // Include SERVED to prevent showing served orders after reset
        },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    console.log(`[TableService] resetTableToEmpty - Cancelled ${cancelledOrders.count} orders for table ${id}`, {
      tableId: id,
      cancelledStatuses: ['PENDING', 'COOKING', 'SERVED'],
    });

    // Create a new empty session for the table
    // This ensures that currentSessionId is set immediately, preventing old orders from showing
    // The new session will be used when customer app loads
    const newSession = await sessionService.createSession({
      tableId: id,
      restaurantId: currentTable.restaurantId,
      guestCount: 0, // Empty session, guest count will be updated when customer app loads
    });

    console.log(`[TableService] resetTableToEmpty - Created new session ${newSession.id} for table ${id}`);

    // Update table status to EMPTY and set the new session ID
    // This ensures that old orders are filtered out immediately
    const table = await prisma.table.update({
      where: { id },
      data: {
        status: TableStatus.EMPTY,
        currentSessionId: newSession.id, // Set new session ID instead of null
      },
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

    // Add qrCodeUrl
    let qrCodeUrl: string | undefined;
    try {
      qrCodeUrl = generateTableQRUrl(table.restaurant, table.tableNumber);
    } catch (error) {
      // If subdomain is not configured, qrCodeUrl will be undefined
      qrCodeUrl = undefined;
    }

    // Emit SSE event for table status change
    // Include the new session ID so frontend can filter orders correctly
    await eventEmitter.publishTableStatusChanged(
      table.restaurantId,
      id,
      TableStatus.EMPTY,
      newSession.id // New session ID after reset
    );

    // Emit session ended event if a session was ended
    if (endedSessionId) {
      await eventEmitter.publishSessionEnded(endedSessionId);
    }

    return { ...table, qrCodeUrl };
  }
}

export const tableService = new TableService();
