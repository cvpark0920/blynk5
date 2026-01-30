import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { config } from '../config';
import { nanoid } from 'nanoid';
import { UserRole, TableStatus } from '@prisma/client';
import { logger } from '../utils/logger';

export class RestaurantService {
  private buildTemplateKey(
    templateKey: string | null | undefined,
    icon?: string,
    labelKo?: string
  ): string {
    const raw = templateKey?.trim();
    const base = raw && raw.length > 0 ? raw : `${icon || ''}-${labelKo || ''}`.trim();
    if (!base) {
      return `chip-${nanoid(6)}`;
    }
    const normalized = base
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣\-_.]/g, '');
    return normalized || `chip-${nanoid(6)}`;
  }

  /**
   * 다음 사용 가능한 서브도메인을 자동 생성합니다.
   * shop_로 시작하는 서브도메인 중 가장 큰 숫자를 찾아서 +1 합니다.
   * @returns 다음 사용 가능한 서브도메인 (예: shop_1, shop_2, ...)
   */
  private async generateNextSubdomain(): Promise<string> {
    // shop_로 시작하는 모든 서브도메인 조회
    const restaurants = await prisma.restaurant.findMany({
      where: {
        subdomain: {
          startsWith: 'shop_',
        },
      },
      select: {
        subdomain: true,
      },
    });

    // 숫자 추출: shop_1 -> 1, shop_123 -> 123
    const numbers: number[] = [];
    for (const restaurant of restaurants) {
      if (restaurant.subdomain) {
        const match = restaurant.subdomain.match(/^shop_(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      }
    }

    // 가장 큰 숫자 찾기
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;

    // 중복 체크 (동시성 문제 대비)
    const nextSubdomain = `shop_${nextNumber}`;
    const existing = await prisma.restaurant.findUnique({
      where: { subdomain: nextSubdomain },
    });

    if (existing) {
      // 중복이면 재귀적으로 다음 번호 시도 (극단적 상황 대비)
      return this.generateNextSubdomain();
    }

    return nextSubdomain;
  }

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
    subdomain?: string | null; // Optional, will be auto-generated if not provided
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

    // Generate subdomain if not provided or empty
    let subdomain = data.subdomain;
    if (subdomain === undefined || subdomain === null || (typeof subdomain === 'string' && subdomain.trim() === '')) {
      // Auto-generate subdomain if not provided, null, or empty
      subdomain = await this.generateNextSubdomain();
    } else {
      // Validate subdomain format if provided
      const trimmedSubdomain = subdomain.trim();
      if (!/^[-a-z0-9_]+$/.test(trimmedSubdomain)) {
        throw createError('서브도메인은 영문 소문자, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.', 400);
      }
      
      // Check if subdomain is already taken
      const existingRestaurant = await prisma.restaurant.findUnique({
        where: { subdomain: trimmedSubdomain },
      });
      
      if (existingRestaurant) {
        throw createError(`서브도메인 '${trimmedSubdomain}'은 이미 사용 중입니다.`, 400);
      }
      
      subdomain = trimmedSubdomain;
    }

    // Create restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        nameKo: data.nameKo,
        nameVn: data.nameVn,
        nameEn: data.nameEn,
        ownerId: owner.id,
        qrCode,
        subdomain,
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

    // Copy central quick chips as restaurant-specific chips (one-time at creation)
    try {
      const templateChips = await prisma.quickChip.findMany({
        where: { restaurantId: null },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      });

      if (templateChips.length > 0) {
        const usedKeysByType = new Map<string, Set<string>>();
        const buildUniqueKey = (type: string, key: string) => {
          const normalized = key || `chip-${nanoid(6)}`;
          const used = usedKeysByType.get(type) || new Set<string>();
          let finalKey = normalized;
          let counter = 1;
          while (used.has(finalKey)) {
            finalKey = `${normalized}-${counter}`;
            counter += 1;
          }
          used.add(finalKey);
          usedKeysByType.set(type, used);
          return finalKey;
        };

        const chipsToCreate = templateChips.map((chip) => {
          const key = this.buildTemplateKey(chip.templateKey, chip.icon, chip.labelKo);
          const uniqueKey = buildUniqueKey(chip.type, key);
          return {
            restaurantId: restaurant.id,
            type: chip.type,
            templateKey: uniqueKey,
            icon: chip.icon,
            labelKo: chip.labelKo,
            labelVn: chip.labelVn,
            labelEn: chip.labelEn,
            labelZh: chip.labelZh,
            messageKo: chip.messageKo,
            messageVn: chip.messageVn,
            messageEn: chip.messageEn,
            messageZh: chip.messageZh,
            displayOrder: chip.displayOrder,
            isActive: chip.isActive,
          };
        });

        await prisma.quickChip.createMany({
          data: chipsToCreate,
        });
      }
    } catch (error: any) {
      logger.error('Failed to copy quick chips for new restaurant', {
        error: error?.message || String(error),
        restaurantId: restaurant.id,
      });
      throw createError('Failed to create restaurant quick chips', 500);
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
    subdomain?: string | null;
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
    
    // Handle subdomain: auto-generate if null or empty, validate if provided
    // If subdomain is undefined, don't change it (keep existing value)
    // If subdomain is null or empty string, auto-generate
    // If subdomain is provided, validate and use it
    logger.info('[updateRestaurant] Received subdomain', { 
      subdomain: restaurantData.subdomain, 
      type: typeof restaurantData.subdomain,
      currentSubdomain: restaurant.subdomain,
      restaurantId: id
    });
    
    if (restaurantData.subdomain !== undefined) {
      if (restaurantData.subdomain === null || (typeof restaurantData.subdomain === 'string' && restaurantData.subdomain.trim() === '')) {
        // Auto-generate subdomain if null or empty
        const generatedSubdomain = await this.generateNextSubdomain();
        logger.info('[updateRestaurant] Auto-generating subdomain', { 
          generatedSubdomain,
          restaurantId: id,
          reason: restaurantData.subdomain === null ? 'null' : 'empty string'
        });
        restaurantData.subdomain = generatedSubdomain;
      } else {
        // Validate subdomain format if provided
        const subdomain = restaurantData.subdomain.trim();
        logger.info('[updateRestaurant] Validating provided subdomain', { subdomain, restaurantId: id });
        // Validate subdomain format: shop_1, shop-1, etc. (alphanumeric, underscore, hyphen)
        if (!/^[a-z0-9_-]+$/.test(subdomain)) {
          throw createError('서브도메인은 영문 소문자, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있습니다.', 400);
        }
        
        // Check if subdomain is already taken by another restaurant
        const existingRestaurant = await prisma.restaurant.findUnique({
          where: { subdomain },
        });
        
        if (existingRestaurant && existingRestaurant.id !== id) {
          throw createError(`서브도메인 '${subdomain}'은 이미 사용 중입니다.`, 400);
        }
        
        restaurantData.subdomain = subdomain;
      }
    } else {
      // If subdomain is undefined and restaurant doesn't have one, auto-generate
      if (!restaurant.subdomain) {
        const generatedSubdomain = await this.generateNextSubdomain();
        logger.info('[updateRestaurant] Restaurant has no subdomain, auto-generating', { 
          generatedSubdomain,
          restaurantId: id
        });
        restaurantData.subdomain = generatedSubdomain;
      } else {
        logger.info('[updateRestaurant] Subdomain is undefined, keeping existing', { 
          existingSubdomain: restaurant.subdomain,
          restaurantId: id
        });
      }
    }
    
    logger.info('[updateRestaurant] Final subdomain to save', { 
      subdomain: restaurantData.subdomain,
      restaurantId: id,
      restaurantDataKeys: Object.keys(restaurantData)
    });
    
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

    logger.info('[updateRestaurant] About to update with restaurantData', { 
      restaurantId: id,
      restaurantDataKeys: Object.keys(restaurantData),
      subdomain: restaurantData.subdomain
    });
    
    // Ensure subdomain is explicitly included in the update data
    const updateData: any = {
      ...restaurantData,
      ownerId,
    };
    
    // Explicitly set subdomain if it was generated or provided
    if (restaurantData.subdomain !== undefined) {
      updateData.subdomain = restaurantData.subdomain;
      logger.info('[updateRestaurant] Explicitly setting subdomain in updateData', { 
        subdomain: updateData.subdomain,
        restaurantId: id
      });
    }
    
    logger.info('[updateRestaurant] Final updateData', { 
      restaurantId: id,
      updateDataKeys: Object.keys(updateData),
      subdomain: updateData.subdomain
    });
    
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: updateData,
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
