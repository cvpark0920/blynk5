import { Request, Response, NextFunction } from 'express';
import { quickChipService } from '../services/quickChipService';
import { createError } from '../middleware/errorHandler';
import { QuickChipType } from '@prisma/client';

// Get all quick chips
export const getQuickChips = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId, type } = req.query;
    
    // restaurantId가 쿼리 파라미터에 없으면 null로 처리 (플랫폼 전체)
    const restaurantIdParam = restaurantId === undefined || restaurantId === '' 
      ? null 
      : (restaurantId as string);
    
    // 관리자 API는 비활성 상용구도 포함 (includeInactive = true)
    const chips = await quickChipService.getQuickChips(
      restaurantIdParam,
      type as QuickChipType | undefined,
      true // 관리자 앱에서는 비활성 상용구도 볼 수 있음
    );
    
    res.json({ success: true, data: chips });
  } catch (error) {
    next(error);
  }
};

// Get quick chip by ID
export const getQuickChipById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    const chip = await quickChipService.getQuickChipById(id);
    
    if (!chip) {
      throw createError('Quick chip not found', 404);
    }
    
    res.json({ success: true, data: chip });
  } catch (error) {
    next(error);
  }
};

// Create quick chip
export const createQuickChip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      restaurantId,
      type,
      templateKey,
      icon,
      labelKo,
      labelVn,
      labelEn,
      labelZh,
      messageKo,
      messageVn,
      messageEn,
      messageZh,
      displayOrder,
      isActive,
    } = req.body;
    
    if (!type || !icon || !labelKo || !labelVn) {
      throw createError('Type, icon, labelKo, and labelVn are required', 400);
    }
    
    if (!Object.values(QuickChipType).includes(type)) {
      throw createError('Invalid quick chip type', 400);
    }
    
    const chip = await quickChipService.createQuickChip({
      restaurantId: restaurantId || null,
      type,
      templateKey,
      icon,
      labelKo,
      labelVn,
      labelEn,
      labelZh,
      messageKo,
      messageVn,
      messageEn,
      messageZh,
      displayOrder,
      isActive,
    });
    
    res.status(201).json({ success: true, data: chip });
  } catch (error) {
    next(error);
  }
};

// Update quick chip
export const updateQuickChip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      templateKey,
      icon,
      labelKo,
      labelVn,
      labelEn,
      labelZh,
      messageKo,
      messageVn,
      messageEn,
      messageZh,
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
      messageKo,
      messageVn,
      messageEn,
      messageZh,
      displayOrder,
      isActive,
    });
    
    res.json({ success: true, data: chip });
  } catch (error) {
    next(error);
  }
};

// Delete quick chip
export const deleteQuickChip = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    await quickChipService.deleteQuickChip(id);
    
    res.json({ success: true, message: 'Quick chip deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Reorder quick chips
export const reorderQuickChips = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      throw createError('Ids array is required', 400);
    }
    
    await quickChipService.reorderQuickChips(ids);
    
    res.json({ success: true, message: 'Quick chips reordered successfully' });
  } catch (error) {
    next(error);
  }
};
