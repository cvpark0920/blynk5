import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';
import { QuickChipType } from '@prisma/client';
import { quickChipService } from '../services/quickChipService';

// Get restaurant public information (no authentication required)
// 서브도메인 기반 또는 restaurantId 파라미터 사용
export const getRestaurantPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 서브도메인 리졸버에서 설정된 restaurantId 우선 사용
    const restaurantId = req.restaurantId || req.params.restaurantId;
    const host = req.get('host') || '';
    const subdomain = req.subdomain;

    if (!restaurantId) {
      // 더 명확한 에러 메시지 제공
      const errorMessage = subdomain 
        ? `서브도메인 ${subdomain}에 해당하는 상점이 없습니다.`
        : '서브도메인을 찾을 수 없습니다. 올바른 URL로 접속해주세요.';
      throw createError(errorMessage, 400);
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
        subdomain: true,
        createdAt: true,
        settings: true, // Include settings to extract splashImageUrl
      },
    });

    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    // Only return active restaurants
    if (restaurant.status !== 'active') {
      throw createError('Restaurant is not active', 404);
    }

    // Extract splashImageUrl from settings (public information)
    const settings = (restaurant.settings as any) || {};
    const splashImageUrl = settings.splashImageUrl || null;

    // Return restaurant data with splashImageUrl (exclude other sensitive settings)
    const { settings: _, ...restaurantData } = restaurant;
    res.json({ 
      success: true, 
      data: {
        ...restaurantData,
        splashImageUrl,
      }
    });
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
// restaurantId가 있으면 중앙 템플릿 + 상점 오버라이드 병합 목록 반환 (중국어 등 중앙 템플릿 zh 적용)
export const getQuickChipsPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId, type } = req.query;
    const parsedType = type && Object.values(QuickChipType).includes(type as QuickChipType)
      ? (type as QuickChipType)
      : undefined;

    const chips = restaurantId
      ? await quickChipService.getMergedQuickChips(restaurantId as string, parsedType, false)
      : await quickChipService.getQuickChips(null, parsedType, false);
    
    res.json({ success: true, data: chips });
  } catch (error) {
    next(error);
  }
};
