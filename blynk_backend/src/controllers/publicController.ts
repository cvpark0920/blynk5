import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { QuickChipType } from '@prisma/client';

// Get restaurant public information (no authentication required)
export const getRestaurantPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        nameKo: true,
        nameVn: true,
        nameEn: true,
        status: true,
        qrCode: true,
        createdAt: true,
        // Exclude sensitive information: ownerId, settings, posPinHash
      },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    // Only return active restaurants
    if (restaurant.status !== 'active') {
      throw createError('Restaurant is not active', 404);
    }

    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

// Get staff list for PIN login (no authentication required, but limited information)
export const getStaffListPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, status: true },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.status !== 'active') {
      throw createError('Restaurant is not active', 404);
    }

    // Get active staff list (without PIN hash and sensitive information)
    const staffList = await prisma.staff.findMany({
      where: {
        restaurantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        // Exclude: email, phone, pinCodeHash, joinedAt, createdAt
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ success: true, data: staffList });
  } catch (error) {
    next(error);
  }
};

// Get list of banks (no authentication required)
export const getBanks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get all banks, ordered by shortName
    const banks = await prisma.bank.findMany({
      where: {
        transferSupported: true, // Only return banks that support transfers
      },
      select: {
        id: true,
        name: true,
        code: true,
        shortName: true,
        logo: true,
        swiftCode: true,
        bin: true, // Include BIN code for QR generation
      },
      orderBy: {
        shortName: 'asc',
      },
    });

    res.json({ success: true, data: banks });
  } catch (error) {
    next(error);
  }
};

// Get quick chips (public API - no authentication required)
export const getQuickChipsPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId, type } = req.query;
    
    const where: any = {
      isActive: true, // Only return active chips
    };
    
    if (restaurantId) {
      // 특정 식당의 상용구 또는 플랫폼 전체 상용구
      where.OR = [
        { restaurantId: restaurantId as string },
        { restaurantId: null }
      ];
    } else {
      // restaurantId가 없으면 플랫폼 전체 상용구만
      where.restaurantId = null;
    }
    
    if (type && Object.values(QuickChipType).includes(type as QuickChipType)) {
      where.type = type;
    }
    
    const chips = await prisma.quickChip.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        restaurantId: true,
        type: true,
        icon: true,
        labelKo: true,
        labelVn: true,
        labelEn: true,
        messageKo: true,
        messageVn: true,
        messageEn: true,
        displayOrder: true,
        isActive: true,
      },
    });
    
    res.json({ success: true, data: chips });
  } catch (error) {
    next(error);
  }
};
