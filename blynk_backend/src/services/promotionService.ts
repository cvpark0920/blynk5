import { prisma } from '../utils/prisma';

export class PromotionService {
  /**
   * 활성 프로모션 조회
   * @param restaurantId 식당 ID
   * @param includeExpired 만료된 프로모션도 포함할지 여부
   * @param showOnLoadOnly 로딩 시 팝업 표시 프로모션만 조회할지 여부
   */
  async getActivePromotions(
    restaurantId: string,
    includeExpired: boolean = false,
    showOnLoadOnly: boolean = false
  ) {
    const now = new Date();
    
    // 먼저 모든 프로모션 조회 (디버깅용)
    const allPromotions = await prisma.promotion.findMany({
      where: { restaurantId },
      select: {
        id: true,
        titleKo: true,
        isActive: true,
        showOnLoad: true,
        startDate: true,
        endDate: true,
      },
    });
    
    console.log('[PromotionService] 모든 프로모션:', {
      restaurantId,
      count: allPromotions.length,
      now: now.toISOString(),
      promotions: allPromotions.map(p => ({
        id: p.id,
        titleKo: p.titleKo,
        isActive: p.isActive,
        showOnLoad: p.showOnLoad,
        startDate: p.startDate.toISOString(),
        endDate: p.endDate.toISOString(),
        isInPeriod: p.startDate <= now && p.endDate >= now,
      })),
    });
    
    const where: any = {
      restaurantId,
      isActive: true,
    };

    if (!includeExpired) {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }

    if (showOnLoadOnly) {
      where.showOnLoad = true;
    }

    console.log('[PromotionService] 쿼리 조건:', {
      where,
      includeExpired,
      showOnLoadOnly,
    });

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        promotionMenuItems: {
          include: {
            menuItem: {
              include: {
                category: true,
                optionGroups: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    console.log('[PromotionService] 활성 프로모션 결과:', {
      count: promotions.length,
      promotions: promotions.map(p => ({
        id: p.id,
        titleKo: p.titleKo,
        isActive: p.isActive,
        showOnLoad: p.showOnLoad,
        startDate: p.startDate.toISOString(),
        endDate: p.endDate.toISOString(),
      })),
    });

    return promotions;
  }

  /**
   * 모든 프로모션 조회 (상점앱용)
   */
  async getAllPromotions(restaurantId: string) {
    return prisma.promotion.findMany({
      where: { restaurantId },
      include: {
        promotionMenuItems: {
          include: {
            menuItem: {
              include: {
                category: true,
                optionGroups: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * 프로모션 생성
   */
  async createPromotion(restaurantId: string, data: {
    titleKo: string;
    titleVn: string;
    titleEn?: string;
    titleZh?: string;
    titleRu?: string;
    descriptionKo?: string;
    descriptionVn?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionRu?: string;
    imageUrl?: string;
    discountPercent?: number;
    startDate: Date;
    endDate: Date;
    displayOrder?: number;
    isActive?: boolean;
    showOnLoad?: boolean;
    menuItemIds?: string[];
  }) {
    const { menuItemIds, ...promotionData } = data;
    
    const promotion = await prisma.promotion.create({
      data: {
        restaurantId,
        displayOrder: promotionData.displayOrder ?? 0,
        isActive: promotionData.isActive ?? true,
        showOnLoad: promotionData.showOnLoad ?? false,
        ...promotionData,
        promotionMenuItems: menuItemIds && menuItemIds.length > 0 ? {
          create: menuItemIds.map(menuItemId => ({
            menuItemId,
          })),
        } : undefined,
      },
      include: {
        promotionMenuItems: {
          include: {
            menuItem: {
              include: {
                category: true,
                optionGroups: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return promotion;
  }

  /**
   * 프로모션 수정
   */
  async updatePromotion(promotionId: string, data: {
    titleKo?: string;
    titleVn?: string;
    titleEn?: string;
    titleZh?: string;
    titleRu?: string;
    descriptionKo?: string;
    descriptionVn?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionRu?: string;
    imageUrl?: string;
    discountPercent?: number;
    startDate?: Date;
    endDate?: Date;
    displayOrder?: number;
    isActive?: boolean;
    showOnLoad?: boolean;
    menuItemIds?: string[];
  }) {
    const { menuItemIds, ...updateData } = data;
    
    // 메뉴 아이템 업데이트가 있는 경우
    if (menuItemIds !== undefined) {
      // 기존 메뉴 아이템 삭제
      await prisma.promotionMenuItem.deleteMany({
        where: { promotionId },
      });
      
      // 새로운 메뉴 아이템 추가
      if (menuItemIds.length > 0) {
        await prisma.promotionMenuItem.createMany({
          data: menuItemIds.map(menuItemId => ({
            promotionId,
            menuItemId,
          })),
        });
      }
    }
    
    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: updateData,
      include: {
        promotionMenuItems: {
          include: {
            menuItem: {
              include: {
                category: true,
                optionGroups: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return promotion;
  }

  /**
   * 프로모션 삭제
   */
  async deletePromotion(promotionId: string) {
    return prisma.promotion.delete({
      where: { id: promotionId },
    });
  }

  /**
   * 프로모션 순서 변경
   */
  async reorderPromotions(restaurantId: string, orderData: Array<{ id: string; displayOrder: number }>) {
    const updates = orderData.map(({ id, displayOrder }) =>
      prisma.promotion.update({
        where: { id, restaurantId },
        data: { displayOrder },
      })
    );

    await prisma.$transaction(updates);
    return this.getAllPromotions(restaurantId);
  }
}

export const promotionService = new PromotionService();
