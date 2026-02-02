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

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return promotions;
  }

  /**
   * 모든 프로모션 조회 (상점앱용)
   */
  async getAllPromotions(restaurantId: string) {
    return prisma.promotion.findMany({
      where: { restaurantId },
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
  }) {
    return prisma.promotion.create({
      data: {
        restaurantId,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        showOnLoad: data.showOnLoad ?? false,
        ...data,
      },
    });
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
  }) {
    return prisma.promotion.update({
      where: { id: promotionId },
      data,
    });
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
