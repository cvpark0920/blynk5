import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { config } from '../config';
import { nanoid } from 'nanoid';
import { UserRole, TableStatus } from '@prisma/client';

export class RestaurantService {
  async getRestaurantByQrCode(qrCode: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { qrCode },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    return restaurant;
  }

  async getRestaurants(userId?: string) {
    const where = userId ? { ownerId: userId } : {};
    
    const restaurants = await prisma.restaurant.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            tables: true,
            staff: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add shopManagerUrl to each restaurant
    return restaurants.map(restaurant => ({
      ...restaurant,
      shopManagerUrl: `${config.frontend.shopUrl}/restaurant/${restaurant.id}/login`,
    }));
  }

  async createRestaurant(data: {
    nameKo: string;
    nameVn: string;
    nameEn?: string;
    ownerEmail: string; // Changed from ownerId to ownerEmail
    qrCode?: string; // Optional, will be auto-generated if not provided
    settings?: any;
    status?: string;
  }) {
    // Find or create user with the provided email
    let owner = await prisma.user.findUnique({
      where: { email: data.ownerEmail },
    });

    if (!owner) {
      // Create new user if doesn't exist
      owner = await prisma.user.create({
        data: {
          email: data.ownerEmail,
          role: UserRole.ADMIN, // Restaurant owner should be ADMIN role
        },
      });
    }

    // Generate QR code if not provided
    const qrCode = data.qrCode || nanoid(21);

    // Create restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        nameKo: data.nameKo,
        nameVn: data.nameVn,
        nameEn: data.nameEn,
        ownerId: owner.id,
        qrCode,
        status: data.status || 'pending',
        settings: data.settings || {},
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            tables: true,
            staff: true,
          },
        },
      },
    });

    // Create tables based on settings.tables count
    const tablesCount = data.settings?.tables || 0;
    if (tablesCount > 0) {
      const tablesToCreate = Array.from({ length: tablesCount }, (_, i) => ({
        restaurantId: restaurant.id,
        tableNumber: i + 1,
        floor: 1,
        capacity: 4,
        qrCode: nanoid(21),
        status: TableStatus.EMPTY,
      }));

      await prisma.table.createMany({
        data: tablesToCreate,
      });
    }

    // Fetch updated restaurant with table count
    const updatedRestaurant = await prisma.restaurant.findUnique({
      where: { id: restaurant.id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            tables: true,
            staff: true,
          },
        },
      },
    });

    if (!updatedRestaurant) {
      throw createError('Failed to create restaurant', 500);
    }

    // Add shopManagerUrl to response
    return {
      ...updatedRestaurant,
      shopManagerUrl: `${config.frontend.shopUrl}/restaurant/${updatedRestaurant.id}/login`,
    };
  }

  async updateRestaurant(id: string, data: {
    nameKo?: string;
    nameVn?: string;
    nameEn?: string;
    status?: string;
    settings?: any;
    ownerEmail?: string;
  }) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    // If ownerEmail is provided and different from current owner email, update owner
    let ownerId = restaurant.ownerId;
    if (data.ownerEmail && data.ownerEmail !== restaurant.owner.email) {
      // Find or create user with the new email
      let newOwner = await prisma.user.findUnique({
        where: { email: data.ownerEmail },
      });

      if (!newOwner) {
        // Create new user if doesn't exist
        newOwner = await prisma.user.create({
          data: {
            email: data.ownerEmail,
            role: 'ADMIN', // Restaurant owner should be ADMIN role
          },
        });
      }

      ownerId = newOwner.id;
    }

    // Update restaurant
    const { ownerEmail, ...restaurantData } = data;
    
    // Handle table count update if settings.tables is provided
    const newTablesCount = restaurantData.settings?.tables;
    if (newTablesCount !== undefined) {
      // Get current table count
      const currentTablesCount = await prisma.table.count({
        where: { restaurantId: id },
      });

      if (newTablesCount > currentTablesCount) {
        // Add new tables
        const tablesToAdd = newTablesCount - currentTablesCount;
        const maxTableNumber = await prisma.table.findFirst({
          where: { restaurantId: id },
          orderBy: { tableNumber: 'desc' },
          select: { tableNumber: true },
        });
        const startTableNumber = (maxTableNumber?.tableNumber || 0) + 1;

        const tablesToCreate = Array.from({ length: tablesToAdd }, (_, i) => ({
          restaurantId: id,
          tableNumber: startTableNumber + i,
          floor: 1,
          capacity: 4,
          qrCode: nanoid(21),
          status: 'EMPTY' as const,
        }));

        await prisma.table.createMany({
          data: tablesToCreate,
        });
      } else if (newTablesCount < currentTablesCount) {
        // Remove excess tables (remove from highest table numbers)
        const tablesToRemove = currentTablesCount - newTablesCount;
        const tablesToDelete = await prisma.table.findMany({
          where: { restaurantId: id },
          orderBy: { tableNumber: 'desc' },
          take: tablesToRemove,
          select: { id: true },
        });

        if (tablesToDelete.length > 0) {
          await prisma.table.deleteMany({
            where: {
              id: { in: tablesToDelete.map(t => t.id) },
            },
          });
        }
      }
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...restaurantData,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            tables: true,
            staff: true,
          },
        },
      },
    });

    // Add shopManagerUrl to response
    return {
      ...updatedRestaurant,
      shopManagerUrl: `${config.frontend.shopUrl}/restaurant/${updatedRestaurant.id}/login`,
    };
  }
}

export const restaurantService = new RestaurantService();
