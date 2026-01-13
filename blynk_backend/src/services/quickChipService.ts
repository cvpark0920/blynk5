import { prisma } from '../utils/prisma';
import { QuickChipType } from '@prisma/client';

export interface CreateQuickChipData {
  restaurantId?: string | null;
  type: QuickChipType;
  icon: string;
  labelKo: string;
  labelVn: string;
  labelEn?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateQuickChipData {
  icon?: string;
  labelKo?: string;
  labelVn?: string;
  labelEn?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export class QuickChipService {
  async getQuickChips(restaurantId?: string | null, type?: QuickChipType, includeInactive: boolean = false) {
    const where: any = {};
    
    // isActive 필터 (관리자 앱에서는 비활성도 볼 수 있음)
    if (!includeInactive) {
      where.isActive = true;
    }
    
    // restaurantId 처리 로직
    if (restaurantId === null || restaurantId === undefined || restaurantId === '') {
      // null/undefined/빈 문자열이면 플랫폼 전체 상용구만 (restaurantId가 null인 것)
      where.restaurantId = null;
    } else {
      // 특정 식당 ID가 있으면: 해당 식당의 상용구 + 플랫폼 전체 상용구 모두
      where.OR = [
        { restaurantId },
        { restaurantId: null }
      ];
    }
    
    if (type) {
      where.type = type;
    }
    
    const chips = await prisma.quickChip.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ],
    });
    
    return chips;
  }

  async getQuickChipById(id: string) {
    return await prisma.quickChip.findUnique({
      where: { id },
    });
  }

  async createQuickChip(data: CreateQuickChipData) {
    return await prisma.quickChip.create({
      data: {
        restaurantId: data.restaurantId || null,
        type: data.type,
        icon: data.icon,
        labelKo: data.labelKo,
        labelVn: data.labelVn,
        labelEn: data.labelEn,
        messageKo: data.messageKo,
        messageVn: data.messageVn,
        messageEn: data.messageEn,
        displayOrder: data.displayOrder || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async updateQuickChip(id: string, data: UpdateQuickChipData) {
    return await prisma.quickChip.update({
      where: { id },
      data: {
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.labelKo !== undefined && { labelKo: data.labelKo }),
        ...(data.labelVn !== undefined && { labelVn: data.labelVn }),
        ...(data.labelEn !== undefined && { labelEn: data.labelEn }),
        ...(data.messageKo !== undefined && { messageKo: data.messageKo }),
        ...(data.messageVn !== undefined && { messageVn: data.messageVn }),
        ...(data.messageEn !== undefined && { messageEn: data.messageEn }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteQuickChip(id: string) {
    return await prisma.quickChip.delete({
      where: { id },
    });
  }

  async reorderQuickChips(ids: string[]) {
    // 트랜잭션으로 순서 업데이트
    return await prisma.$transaction(
      ids.map((id, index) =>
        prisma.quickChip.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );
  }
}

export const quickChipService = new QuickChipService();
