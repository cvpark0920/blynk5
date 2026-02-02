import { Request, Response, NextFunction } from 'express';
import { AuthRequest, checkRestaurantAccess } from '../middleware/auth';
import { promotionService } from '../services/promotionService';
import { createError } from '../middleware/errorHandler';

/**
 * 프로모션 목록 조회 (상점앱용)
 */
export const getPromotions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.params;

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.isOwner && !access.isManager) {
      throw createError('Only owners or managers can view promotions', 403);
    }

    const promotions = await promotionService.getAllPromotions(restaurantId);
    res.json({ success: true, data: promotions });
  } catch (error) {
    next(error);
  }
};

/**
 * 프로모션 생성
 */
export const createPromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId } = req.params;
    const {
      titleKo,
      titleVn,
      titleEn,
      titleZh,
      titleRu,
      descriptionKo,
      descriptionVn,
      descriptionEn,
      descriptionZh,
      descriptionRu,
      imageUrl,
      discountPercent,
      startDate,
      endDate,
      displayOrder,
      isActive,
      showOnLoad,
      menuItemIds,
    } = req.body;

    if (!restaurantId || !titleKo || !titleVn) {
      throw createError('Restaurant ID, titleKo, and titleVn are required', 400);
    }

    if (!startDate || !endDate) {
      throw createError('Start date and end date are required', 400);
    }

    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
      throw createError('Discount percent must be between 0 and 100', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw createError('End date must be after start date', 400);
    }

    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.isOwner && !access.isManager) {
      throw createError('Only owners or managers can create promotions', 403);
    }

    const promotion = await promotionService.createPromotion(restaurantId, {
      titleKo,
      titleVn,
      titleEn,
      titleZh,
      titleRu,
      descriptionKo,
      descriptionVn,
      descriptionEn,
      descriptionZh,
      descriptionRu,
      imageUrl,
      discountPercent,
      startDate: start,
      endDate: end,
      displayOrder,
      isActive,
      showOnLoad,
      menuItemIds: Array.isArray(menuItemIds) ? menuItemIds : undefined,
    });

    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
};

/**
 * 프로모션 수정
 */
export const updatePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId, promotionId } = req.params;
    const {
      titleKo,
      titleVn,
      titleEn,
      titleZh,
      titleRu,
      descriptionKo,
      descriptionVn,
      descriptionEn,
      descriptionZh,
      descriptionRu,
      imageUrl,
      discountPercent,
      startDate,
      endDate,
      displayOrder,
      isActive,
      showOnLoad,
      menuItemIds,
    } = req.body;

    if (!restaurantId || !promotionId) {
      throw createError('Restaurant ID and Promotion ID are required', 400);
    }

    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
      throw createError('Discount percent must be between 0 and 100', 400);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        throw createError('End date must be after start date', 400);
      }
    }

    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.isOwner && !access.isManager) {
      throw createError('Only owners or managers can update promotions', 403);
    }

    // 프로모션이 해당 식당에 속하는지 확인
    const existingPromotion = await promotionService.getAllPromotions(restaurantId);
    const promotion = existingPromotion.find(p => p.id === promotionId);
    if (!promotion) {
      throw createError('Promotion not found', 404);
    }

    const updateData: any = {};
    if (titleKo !== undefined) updateData.titleKo = titleKo;
    if (titleVn !== undefined) updateData.titleVn = titleVn;
    if (titleEn !== undefined) updateData.titleEn = titleEn;
    if (titleZh !== undefined) updateData.titleZh = titleZh;
    if (titleRu !== undefined) updateData.titleRu = titleRu;
    if (descriptionKo !== undefined) updateData.descriptionKo = descriptionKo;
    if (descriptionVn !== undefined) updateData.descriptionVn = descriptionVn;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (descriptionZh !== undefined) updateData.descriptionZh = descriptionZh;
    if (descriptionRu !== undefined) updateData.descriptionRu = descriptionRu;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (discountPercent !== undefined) updateData.discountPercent = discountPercent;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (showOnLoad !== undefined) updateData.showOnLoad = showOnLoad;
    if (menuItemIds !== undefined) updateData.menuItemIds = Array.isArray(menuItemIds) ? menuItemIds : [];

    const updatedPromotion = await promotionService.updatePromotion(promotionId, updateData);
    res.json({ success: true, data: updatedPromotion });
  } catch (error) {
    next(error);
  }
};

/**
 * 프로모션 삭제
 */
export const deletePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw createError('Authentication required', 401);
    }

    const { restaurantId, promotionId } = req.params;

    if (!restaurantId || !promotionId) {
      throw createError('Restaurant ID and Promotion ID are required', 400);
    }

    const access = await checkRestaurantAccess(authReq.user.userId, restaurantId);
    if (!access.isOwner && !access.isManager) {
      throw createError('Only owners or managers can delete promotions', 403);
    }

    // 프로모션이 해당 식당에 속하는지 확인
    const existingPromotion = await promotionService.getAllPromotions(restaurantId);
    const promotion = existingPromotion.find(p => p.id === promotionId);
    if (!promotion) {
      throw createError('Promotion not found', 404);
    }

    await promotionService.deletePromotion(promotionId);
    res.json({ success: true, message: 'Promotion deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * 활성 프로모션 조회 (고객앱용, 공개 API)
 */
export const getActivePromotions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params;
    const { showOnLoadOnly } = req.query;

    if (!restaurantId) {
      throw createError('Restaurant ID is required', 400);
    }

    console.log('[getActivePromotions] 요청:', {
      restaurantId,
      showOnLoadOnly,
      now: new Date().toISOString(),
    });

    // 먼저 모든 프로모션 조회 (디버깅용)
    const allPromotions = await promotionService.getAllPromotions(restaurantId);
    console.log('[getActivePromotions] 모든 프로모션:', {
      count: allPromotions.length,
      promotions: allPromotions.map(p => ({
        id: p.id,
        titleKo: p.titleKo,
        isActive: p.isActive,
        showOnLoad: p.showOnLoad,
        startDate: p.startDate,
        endDate: p.endDate,
        now: new Date().toISOString(),
      })),
    });

    const promotions = await promotionService.getActivePromotions(
      restaurantId,
      false, // includeExpired
      showOnLoadOnly === 'true' // showOnLoadOnly
    );

    console.log('[getActivePromotions] 활성 프로모션:', {
      count: promotions.length,
      promotions: promotions.map(p => ({
        id: p.id,
        titleKo: p.titleKo,
        isActive: p.isActive,
        showOnLoad: p.showOnLoad,
        startDate: p.startDate,
        endDate: p.endDate,
        promotionMenuItemsCount: p.promotionMenuItems?.length || 0,
        promotionMenuItems: p.promotionMenuItems?.map(pmi => ({
          id: pmi.id,
          menuItemId: pmi.menuItemId,
          menuItemName: pmi.menuItem?.nameKo,
        })) || [],
      })),
    });

    // Map promotionMenuItems to menuItems for convenience
    const promotionsWithMenuItems = promotions.map(promo => ({
      ...promo,
      menuItems: promo.promotionMenuItems?.map(pmi => pmi.menuItem) || [],
    }));

    console.log('[getActivePromotions] 매핑된 프로모션:', {
      count: promotionsWithMenuItems.length,
      promotions: promotionsWithMenuItems.map(p => ({
        id: p.id,
        titleKo: p.titleKo,
        menuItemsCount: p.menuItems?.length || 0,
        menuItems: p.menuItems?.map(mi => ({
          id: mi.id,
          nameKo: mi.nameKo,
          imageUrl: mi.imageUrl,
        })) || [],
      })),
    });

    res.json({ success: true, data: promotionsWithMenuItems });
  } catch (error) {
    console.error('[getActivePromotions] 오류:', error);
    next(error);
  }
};
