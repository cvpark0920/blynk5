import { prisma } from '../utils/prisma';

export class MenuService {
  async getMenuByRestaurantId(restaurantId: string) {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      include: {
        menuItems: {
          include: {
            optionGroups: {
              include: {
                options: true,
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return categories;
  }

  async createCategory(data: {
    restaurantId: string;
    nameKo: string;
    nameVn: string;
    nameEn?: string;
    displayOrder: number;
  }) {
    return prisma.menuCategory.create({
      data,
    });
  }

  async updateCategory(id: string, data: {
    nameKo?: string;
    nameVn?: string;
    nameEn?: string;
    displayOrder?: number;
  }) {
    return prisma.menuCategory.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    return prisma.menuCategory.delete({
      where: { id },
    });
  }

  async createMenuItem(data: {
    categoryId: string;
    restaurantId: string;
    nameKo: string;
    nameVn: string;
    nameEn?: string;
    descriptionKo?: string;
    descriptionVn?: string;
    descriptionEn?: string;
    priceVnd: number;
    imageUrl?: string;
    displayOrder: number;
    optionGroups?: Array<{
      nameKo: string;
      nameVn: string;
      nameEn?: string;
      minSelect: number;
      maxSelect: number;
      options: Array<{
        nameKo: string;
        nameVn: string;
        nameEn?: string;
        priceVnd: number;
      }>;
    }>;
  }) {
    const { optionGroups, ...menuItemData } = data;
    
    return prisma.menuItem.create({
      data: {
        ...menuItemData,
        optionGroups: optionGroups ? {
          create: optionGroups.map(og => ({
            nameKo: og.nameKo,
            nameVn: og.nameVn,
            nameEn: og.nameEn,
            minSelect: og.minSelect,
            maxSelect: og.maxSelect,
            options: {
              create: og.options.map(opt => ({
                nameKo: opt.nameKo,
                nameVn: opt.nameVn,
                nameEn: opt.nameEn,
                priceVnd: opt.priceVnd,
              })),
            },
          })),
        } : undefined,
      },
      include: {
        optionGroups: {
          include: {
            options: true,
          },
        },
      },
    });
  }

  async updateMenuItem(id: string, data: {
    categoryId?: string;
    nameKo?: string;
    nameVn?: string;
    nameEn?: string;
    descriptionKo?: string;
    descriptionVn?: string;
    descriptionEn?: string;
    priceVnd?: number;
    imageUrl?: string;
    isSoldOut?: boolean;
    displayOrder?: number;
    optionGroups?: Array<{
      nameKo: string;
      nameVn: string;
      nameEn?: string;
      minSelect: number;
      maxSelect: number;
      options: Array<{
        nameKo: string;
        nameVn: string;
        nameEn?: string;
        priceVnd: number;
      }>;
    }>;
  }) {
    const { optionGroups, ...updateData } = data;
    
    // If optionGroups is provided, delete existing ones and create new ones
    if (optionGroups !== undefined) {
      // Clear order item option references first to avoid FK violations
      await prisma.orderItemOption.deleteMany({
        where: {
          option: {
            optionGroup: {
              menuItemId: id,
            },
          },
        },
      });

      // Delete existing option groups (cascade will delete options)
      await prisma.menuOptionGroup.deleteMany({
        where: { menuItemId: id },
      });
    }
    
    return prisma.menuItem.update({
      where: { id },
      data: {
        ...updateData,
        ...(optionGroups !== undefined ? {
          optionGroups: {
            create: optionGroups.map(og => ({
              nameKo: og.nameKo,
              nameVn: og.nameVn,
              nameEn: og.nameEn,
              minSelect: og.minSelect,
              maxSelect: og.maxSelect,
              options: {
                create: og.options.map(opt => ({
                  nameKo: opt.nameKo,
                  nameVn: opt.nameVn,
                  nameEn: opt.nameEn,
                  priceVnd: opt.priceVnd,
                })),
              },
            })),
          },
        } : {}),
      },
      include: {
        optionGroups: {
          include: {
            options: true,
          },
        },
      },
    });
  }

  async deleteMenuItem(id: string) {
    return prisma.menuItem.delete({
      where: { id },
    });
  }
}

export const menuService = new MenuService();
