import { Request, Response, NextFunction } from 'express';
import { QuickChipType, StaffRole, StaffStatus } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { quickChipService } from '../services/quickChipService';
import { AuthRequest } from '../middleware/auth';

const ensureOwnerOrManager = async (authReq: AuthRequest, restaurantId: string) => {
  if (!authReq.user) {
    throw createError('Authentication required', 401);
  }

  const userId = authReq.user.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  if (user.role === 'PLATFORM_ADMIN') {
    return;
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      owner: true,
    },
  });

  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  const isOwner = restaurant.ownerId === userId;
  if (isOwner) {
    return;
  }

  let staffMember = null;
  if (authReq.user.staffId) {
    staffMember = await prisma.staff.findFirst({
      where: {
        id: authReq.user.staffId,
        restaurantId,
        role: { in: [StaffRole.OWNER, StaffRole.MANAGER] },
        status: StaffStatus.ACTIVE,
      },
    });
  }

  if (!staffMember && user.email) {
    staffMember = await prisma.staff.findFirst({
      where: {
        restaurantId,
        email: user.email,
        status: StaffStatus.ACTIVE,
        role: { in: [StaffRole.OWNER, StaffRole.MANAGER] },
      },
    });
  }

  if (!staffMember) {
    throw createError('Only owners and managers can manage quick chips', 403);
  }
};

export const getQuickChipTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, includeInactive } = req.query;
    const parsedType = type && Object.values(QuickChipType).includes(type as QuickChipType)
      ? (type as QuickChipType)
      : undefined;
    const includeInactiveFlag = includeInactive === 'true';

    const chips = await quickChipService.getQuickChips(
      null,
      parsedType,
      includeInactiveFlag
    );

    res.json({ success: true, data: chips });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantQuickChips = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const { restaurantId, type, includeInactive } = req.query;
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    await ensureOwnerOrManager(authReq, restaurantId);

    const parsedType = type && Object.values(QuickChipType).includes(type as QuickChipType)
      ? (type as QuickChipType)
      : undefined;
    const includeInactiveFlag = includeInactive === 'true';

    const chips = await quickChipService.getRestaurantQuickChips(
      restaurantId,
      parsedType,
      includeInactiveFlag
    );

    res.json({ success: true, data: chips });
  } catch (error) {
    next(error);
  }
};

export const createRestaurantQuickChip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const {
      restaurantId,
      type,
      templateKey,
      icon,
      labelKo,
      labelVn,
      labelEn,
      labelZh,
      labelRu,
      messageKo,
      messageVn,
      messageEn,
      messageZh,
      messageRu,
      displayOrder,
      isActive,
    } = req.body;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    if (!type || !icon || !labelKo || !labelVn) {
      throw createError('Type, icon, labelKo, and labelVn are required', 400);
    }

    if (!Object.values(QuickChipType).includes(type)) {
      throw createError('Invalid quick chip type', 400);
    }

    await ensureOwnerOrManager(authReq, restaurantId);

    const chip = await quickChipService.createQuickChip({
      restaurantId,
      type,
      templateKey,
      icon,
      labelKo,
      labelVn,
      labelEn,
      labelZh,
      labelRu,
      messageKo,
      messageVn,
      messageEn,
      messageZh,
      messageRu,
      displayOrder,
      isActive,
    });

    res.status(201).json({ success: true, data: chip });
  } catch (error) {
    next(error);
  }
};

export const updateRestaurantQuickChip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { restaurantId } = req.query;
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    await ensureOwnerOrManager(authReq, restaurantId);

    const existing = await quickChipService.getQuickChipById(id);
    if (!existing || existing.restaurantId !== restaurantId) {
      throw createError('Quick chip not found', 404);
    }

    const {
      templateKey,
      icon,
      labelKo,
      labelVn,
      labelEn,
      labelZh,
      labelRu,
      messageKo,
      messageVn,
      messageEn,
      messageZh,
      messageRu,
      displayOrder,
      isActive,
    } = req.body;

    const chip = await quickChipService.updateQuickChip(id, {
      templateKey,
      icon,
      labelKo,
      labelVn,
      labelEn,
      labelZh,
      labelRu,
      messageKo,
      messageVn,
      messageEn,
      messageZh,
      messageRu,
      displayOrder,
      isActive,
    });

    res.json({ success: true, data: chip });
  } catch (error) {
    next(error);
  }
};

export const deleteRestaurantQuickChip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { restaurantId } = req.query;
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    await ensureOwnerOrManager(authReq, restaurantId);

    const existing = await quickChipService.getQuickChipById(id);
    if (!existing || existing.restaurantId !== restaurantId) {
      throw createError('Quick chip not found', 404);
    }

    await quickChipService.deleteQuickChip(id);
    res.json({ success: true, message: 'Quick chip deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const reorderRestaurantQuickChips = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    const { restaurantId } = req.query;
    const { ids } = req.body;

    if (!restaurantId || typeof restaurantId !== 'string') {
      throw createError('Restaurant ID is required', 400);
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      throw createError('Ids array is required', 400);
    }

    await ensureOwnerOrManager(authReq, restaurantId);

    const existing = await prisma.quickChip.findMany({
      where: {
        id: { in: ids },
        restaurantId,
      },
      select: { id: true },
    });

    if (existing.length !== ids.length) {
      throw createError('Some quick chips were not found', 404);
    }

    await quickChipService.reorderQuickChips(ids);
    res.json({ success: true, message: 'Quick chips reordered successfully' });
  } catch (error) {
    next(error);
  }
};
