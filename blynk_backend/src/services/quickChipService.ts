import { prisma } from '../utils/prisma';
import { QuickChipType } from '@prisma/client';

export interface CreateQuickChipData {
  restaurantId?: string | null;
  type: QuickChipType;
  templateKey?: string | null;
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
  templateKey?: string | null;
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
  private buildTemplateKey(
    templateKey: string | null | undefined,
    icon?: string,
    labelKo?: string
  ): string | null {
    const raw = templateKey?.trim();
    const base = raw && raw.length > 0 ? raw : `${icon || ''}-${labelKo || ''}`.trim();
    if (!base) {
      return null;
    }
    return base
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣\-_.]/g, '');
  }

  private resolveTemplateKey(chip: { templateKey?: string | null; icon: string; labelKo: string }): string | null {
    return this.buildTemplateKey(chip.templateKey ?? null, chip.icon, chip.labelKo);
  }

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

  async getMergedQuickChips(
    restaurantId: string,
    type?: QuickChipType,
    includeInactive: boolean = false
  ) {
    const baseWhere = (restaurantIdValue: string | null) => ({
      restaurantId: restaurantIdValue,
      ...(type ? { type } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    });

    const [platformChips, restaurantChips] = await Promise.all([
      prisma.quickChip.findMany({
        where: baseWhere(null),
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.quickChip.findMany({
        where: baseWhere(restaurantId),
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const mergedMap = new Map<string, typeof platformChips[number]>();

    for (const chip of platformChips) {
      const key = this.resolveTemplateKey(chip);
      if (!key) continue;
      mergedMap.set(key, chip);
    }

    for (const chip of restaurantChips) {
      const key = this.resolveTemplateKey(chip);
      if (!key) continue;
      mergedMap.set(key, chip);
    }

    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return merged;
  }

  async getRestaurantQuickChips(
    restaurantId: string,
    type?: QuickChipType,
    includeInactive: boolean = false
  ) {
    return prisma.quickChip.findMany({
      where: {
        restaurantId,
        ...(type ? { type } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getQuickChipById(id: string) {
    return await prisma.quickChip.findUnique({
      where: { id },
    });
  }

  async createQuickChip(data: CreateQuickChipData) {
    const templateKey = this.buildTemplateKey(data.templateKey ?? null, data.icon, data.labelKo);
    return await prisma.quickChip.create({
      data: {
        restaurantId: data.restaurantId || null,
        type: data.type,
        templateKey,
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
    const templateKey = data.templateKey !== undefined
      ? this.buildTemplateKey(data.templateKey ?? null, data.icon, data.labelKo)
      : undefined;
    return await prisma.quickChip.update({
      where: { id },
      data: {
        ...(templateKey !== undefined && { templateKey }),
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
