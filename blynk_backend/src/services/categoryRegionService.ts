import { prisma } from '../utils/prisma';
import { createError } from '../middleware/errorHandler';

export class CategoryRegionService {
  // Category methods
  async getCategories() {
    return prisma.restaurantCategory.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async createCategory(data: {
    nameKo: string;
    nameVn: string;
    nameEn?: string;
    displayOrder?: number;
  }) {
    const maxOrder = await prisma.restaurantCategory.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    return prisma.restaurantCategory.create({
      data: {
        ...data,
        displayOrder: data.displayOrder ?? (maxOrder?.displayOrder ?? 0) + 1,
      },
    });
  }

  async updateCategory(id: string, data: {
    nameKo?: string;
    nameVn?: string;
    nameEn?: string;
    displayOrder?: number;
  }) {
    return prisma.restaurantCategory.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    // Check if category is in use
    const category = await prisma.restaurantCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw createError('Category not found', 404);
    }

    // Check if any restaurant uses this category
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, settings: true },
    });

    const restaurantsUsingCategory = restaurants.filter((r) => {
      const settings = r.settings as any;
      return settings?.category === category.nameKo;
    });

    if (restaurantsUsingCategory.length > 0) {
      throw createError('카테고리를 사용하는 식당이 있습니다.', 400);
    }

    return prisma.restaurantCategory.delete({
      where: { id },
    });
  }

  // Region methods
  async getRegions() {
    return prisma.restaurantRegion.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async createRegion(data: {
    nameKo: string;
    nameVn: string;
    nameEn?: string;
    displayOrder?: number;
  }) {
    const maxOrder = await prisma.restaurantRegion.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    return prisma.restaurantRegion.create({
      data: {
        ...data,
        displayOrder: data.displayOrder ?? (maxOrder?.displayOrder ?? 0) + 1,
      },
    });
  }

  async updateRegion(id: string, data: {
    nameKo?: string;
    nameVn?: string;
    nameEn?: string;
    displayOrder?: number;
  }) {
    return prisma.restaurantRegion.update({
      where: { id },
      data,
    });
  }

  async deleteRegion(id: string) {
    // Check if region is in use
    const region = await prisma.restaurantRegion.findUnique({
      where: { id },
    });

    if (!region) {
      throw createError('Region not found', 404);
    }

    // Check if any restaurant uses this region
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, settings: true },
    });

    const restaurantsUsingRegion = restaurants.filter((r) => {
      const settings = r.settings as any;
      return settings?.region === region.nameKo;
    });

    if (restaurantsUsingRegion.length > 0) {
      throw createError('지역을 사용하는 식당이 있습니다.', 400);
    }

    return prisma.restaurantRegion.delete({
      where: { id },
    });
  }
}

export const categoryRegionService = new CategoryRegionService();
