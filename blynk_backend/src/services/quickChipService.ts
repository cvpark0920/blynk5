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
  labelZh?: string;
  labelRu?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
  messageZh?: string;
  messageRu?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateQuickChipData {
  templateKey?: string | null;
  icon?: string;
  labelKo?: string;
  labelVn?: string;
  labelEn?: string;
  labelZh?: string;
  labelRu?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
  messageZh?: string;
  messageRu?: string;
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

    const platformMap = new Map<string, typeof platformChips[number]>();
    for (const chip of platformChips) {
      const key = this.resolveTemplateKey(chip);
      if (!key) continue;
      platformMap.set(key, chip);
    }

    // 상점 오버라이드를 중앙 템플릿 위에 병합 (중국어/러시아어 필드는 상점 오버라이드에 없으면 중앙 템플릿 값 사용)
    const mergedMap = new Map<string, typeof platformChips[number]>();
    
    // 먼저 중앙 템플릿을 모두 추가
    for (const chip of platformChips) {
      const key = this.resolveTemplateKey(chip);
      if (!key) continue;
      mergedMap.set(key, chip);
    }

    // 상점 오버라이드를 병합 (중국어/러시아어 필드가 없거나 null이면 중앙 템플릿 값 사용)
    for (const override of restaurantChips) {
      const key = this.resolveTemplateKey(override);
      if (!key) continue;
      
      const platformChip = platformMap.get(key);
      if (platformChip) {
        // 중앙 템플릿이 있으면 병합
        // 중국어/러시아어 필드는 상점 오버라이드에 유효한 값(문자열)이 있으면 사용, 없거나 null/undefined이면 중앙 템플릿 값 사용
        const overrideLabelZh = override.labelZh && typeof override.labelZh === 'string' && override.labelZh.trim();
        const overrideMessageZh = override.messageZh && typeof override.messageZh === 'string' && override.messageZh.trim();
        const overrideLabelRu = override.labelRu && typeof override.labelRu === 'string' && override.labelRu.trim();
        const overrideMessageRu = override.messageRu && typeof override.messageRu === 'string' && override.messageRu.trim();
        const platformLabelZh = platformChip.labelZh && typeof platformChip.labelZh === 'string' && platformChip.labelZh.trim();
        const platformMessageZh = platformChip.messageZh && typeof platformChip.messageZh === 'string' && platformChip.messageZh.trim();
        const platformLabelRu = platformChip.labelRu && typeof platformChip.labelRu === 'string' && platformChip.labelRu.trim();
        const platformMessageRu = platformChip.messageRu && typeof platformChip.messageRu === 'string' && platformChip.messageRu.trim();
        
        mergedMap.set(key, {
          ...override,
          labelZh: overrideLabelZh || platformLabelZh || null,
          messageZh: overrideMessageZh || platformMessageZh || null,
          labelRu: overrideLabelRu || platformLabelRu || null,
          messageRu: overrideMessageRu || platformMessageRu || null,
        });
      } else {
        // 중앙 템플릿이 없으면 상점 오버라이드만 사용
        mergedMap.set(key, override);
      }
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
        labelZh: data.labelZh,
        labelRu: data.labelRu,
        messageKo: data.messageKo,
        messageVn: data.messageVn,
        messageEn: data.messageEn,
        messageZh: data.messageZh,
        messageRu: data.messageRu,
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
        ...(data.labelZh !== undefined && { labelZh: data.labelZh }),
        ...(data.labelRu !== undefined && { labelRu: data.labelRu }),
        ...(data.messageKo !== undefined && { messageKo: data.messageKo }),
        ...(data.messageVn !== undefined && { messageVn: data.messageVn }),
        ...(data.messageEn !== undefined && { messageEn: data.messageEn }),
        ...(data.messageZh !== undefined && { messageZh: data.messageZh }),
        ...(data.messageRu !== undefined && { messageRu: data.messageRu }),
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
