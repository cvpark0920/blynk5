import { prisma } from '../utils/prisma';
import { OrderStatus } from '@prisma/client';

export interface SalesStatistics {
  today: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
  };
  yesterday: {
    revenue: number;
    orders: number;
  };
  weekly: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  turnoverRate: number;
}

export interface CategoryDistribution {
  categoryId: string;
  categoryName: string;
  revenue: number;
  percentage: number;
}

export interface TopMenuItem {
  menuItemId: string;
  menuItemName: string;
  orderCount: number;
  revenue: number;
}

export interface HourlyOrderData {
  time: string;
  orders: number;
}

export interface SalesReport {
  statistics: SalesStatistics;
  hourlyOrders: HourlyOrderData[];
  categoryDistribution: CategoryDistribution[];
  topMenuItems: TopMenuItem[];
}

export interface SalesHistoryItem {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesHistoryEntry {
  orderId: string;
  orderNumber: number; // 순번 (1, 2, 3, ...)
  sessionId: string; // 세션 ID (테이블별 그룹핑용)
  tableNumber: number;
  createdAt: string;
  totalAmount: number;
  status: OrderStatus;
  items: SalesHistoryItem[];
}

export class ReportService {
  /**
   * Get sales statistics for a restaurant
   */
  async getSalesStatistics(
    restaurantId: string,
    period: 'today' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesStatistics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);

    // Calculate period start date
    let periodStart: Date;
    let periodEnd: Date;
    
    if (startDate && endDate) {
      // Use custom date range
      periodStart = new Date(startDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(endDate);
      periodEnd.setHours(23, 59, 59, 999);
      periodEnd.setDate(periodEnd.getDate() + 1); // Include the end date
    } else if (period === 'today') {
      periodStart = todayStart;
      periodEnd = todayEnd;
    } else if (period === 'week') {
      // 이번 주의 시작(월요일)부터 오늘까지
      periodStart = new Date(todayStart);
      const dayOfWeek = periodStart.getDay(); // 0 = 일요일, 1 = 월요일, ...
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 일요일이면 6일 전, 아니면 (요일-1)일 전
      periodStart.setDate(periodStart.getDate() - daysToMonday);
      periodEnd = todayEnd;
    } else {
      // month
      periodStart = new Date(todayStart);
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodEnd = todayEnd;
    }

    // Get today's orders (include both SERVED and PAID orders)
    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.SERVED, OrderStatus.PAID] },
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const todayOrderCount = todayOrders.length;
    const avgOrderValue = todayOrderCount > 0 ? Math.round(todayRevenue / todayOrderCount) : 0;

    // Get yesterday's orders (include both SERVED and PAID orders)
    const yesterdayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.SERVED, OrderStatus.PAID] },
        createdAt: {
          gte: yesterdayStart,
          lt: yesterdayEnd,
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const yesterdayOrderCount = yesterdayOrders.length;

    // Get weekly data
    const weeklyData: Array<{ date: string; revenue: number; orders: number }> = [];
    
    // Calculate days to show based on period or date range
    let daysToShow: number;
    let startDateForLoop: Date;
    
    if (startDate && endDate) {
      // For custom date range, calculate the number of days between start and end
      const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
      daysToShow = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      startDateForLoop = new Date(periodStart);
    } else {
      if (period === 'week') {
        // 이번 주의 일수 계산 (월요일부터 오늘까지)
        const dayOfWeek = todayStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        daysToShow = daysToMonday + 1; // 월요일부터 오늘까지
        startDateForLoop = new Date(periodStart);
      } else if (period === 'month') {
        daysToShow = 30;
        startDateForLoop = new Date(periodStart);
      } else {
        daysToShow = 1;
        startDateForLoop = new Date(todayStart);
      }
    }

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDateForLoop);
      date.setDate(date.getDate() + i);
      const dateEnd = new Date(date);
      dateEnd.setDate(dateEnd.getDate() + 1);
      
      // Skip dates outside the period range (should not happen, but safety check)
      if (startDate && endDate && (date < periodStart || date >= periodEnd)) {
        continue;
      }

      const dayOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: { in: [OrderStatus.SERVED, OrderStatus.PAID] },
          createdAt: {
            gte: date,
            lt: dateEnd,
          },
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const dayOrderCount = dayOrders.length;

      weeklyData.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue,
        orders: dayOrderCount,
      });
    }

    // Calculate turnover rate (orders per table)
    const tableCount = await prisma.table.count({
      where: { restaurantId },
    });

    // Calculate total orders for the period
    const periodTotalOrders = period === 'today' 
      ? todayOrderCount
      : weeklyData.reduce((sum, day) => sum + day.orders, 0);

    const turnoverRate = tableCount > 0 ? Number((periodTotalOrders / tableCount).toFixed(1)) : 0;

    return {
      today: {
        revenue: todayRevenue,
        orders: todayOrderCount,
        avgOrderValue,
      },
      yesterday: {
        revenue: yesterdayRevenue,
        orders: yesterdayOrderCount,
      },
      weekly: weeklyData,
      turnoverRate,
    };
  }

  /**
   * Get hourly order count for a period (date range or specific date)
   */
  async getHourlyOrders(
    restaurantId: string, 
    period: 'today' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<HourlyOrderData[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let periodStart: Date;
    let periodEnd: Date;

    if (startDate && endDate) {
      // Use custom date range
      periodStart = new Date(startDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(endDate);
      periodEnd.setHours(23, 59, 59, 999);
      periodEnd.setDate(periodEnd.getDate() + 1); // Include the end date
    } else if (period === 'today') {
      periodStart = todayStart;
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (period === 'week') {
      periodStart = new Date(todayStart);
      periodStart.setDate(periodStart.getDate() - 7);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else {
      // month
      periodStart = new Date(todayStart);
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    }

    // Get all orders for the period (include both SERVED and PAID orders)
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.SERVED, OrderStatus.PAID] },
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by hour (11:00-22:00) - aggregate across all days in the period
    const hourlyData: { [hour: number]: number } = {};
    for (let hour = 11; hour <= 22; hour++) {
      hourlyData[hour] = 0;
    }

    orders.forEach((order) => {
      const orderHour = order.createdAt.getHours();
      if (orderHour >= 11 && orderHour <= 22) {
        hourlyData[orderHour] = (hourlyData[orderHour] || 0) + 1;
      }
    });

    return Object.entries(hourlyData).map(([hour, count]) => ({
      time: `${hour.toString().padStart(2, '0')}:00`,
      orders: count,
    }));
  }

  /**
   * Get category distribution for a period
   */
  async getCategoryDistribution(
    restaurantId: string,
    period: 'today' | 'week' | 'month',
    language: 'ko' | 'vn' | 'en' = 'ko',
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryDistribution[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let periodStart: Date;
    let periodEnd: Date;

    if (startDate && endDate) {
      // Use custom date range
      periodStart = new Date(startDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(endDate);
      periodEnd.setHours(23, 59, 59, 999);
      periodEnd.setDate(periodEnd.getDate() + 1); // Include the end date
    } else if (period === 'today') {
      periodStart = todayStart;
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (period === 'week') {
      periodStart = new Date(todayStart);
      periodStart.setDate(periodStart.getDate() - 7);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else {
      periodStart = new Date(todayStart);
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    }

    // Get all served/paid orders in the period
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.SERVED, OrderStatus.PAID] },
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Calculate revenue by category
    const categoryRevenue: { [categoryId: string]: { name: string; revenue: number } } = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const categoryId = item.menuItem.categoryId;
        const category = item.menuItem.category;
        const categoryName =
          language === 'ko'
            ? category.nameKo
            : language === 'vn'
            ? category.nameVn
            : category.nameEn || category.nameKo;

        if (!categoryRevenue[categoryId]) {
          categoryRevenue[categoryId] = {
            name: categoryName,
            revenue: 0,
          };
        }
        categoryRevenue[categoryId].revenue += item.totalPrice;
      });
    });

    const totalRevenue = Object.values(categoryRevenue).reduce(
      (sum, cat) => sum + cat.revenue,
      0
    );

    return Object.entries(categoryRevenue).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
    }));
  }

  /**
   * Get top menu items by order count and revenue
   */
  async getTopMenuItems(
    restaurantId: string,
    period: 'today' | 'week' | 'month',
    limit: number = 5,
    language: 'ko' | 'vn' | 'en' = 'ko',
    startDate?: Date,
    endDate?: Date
  ): Promise<TopMenuItem[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let periodStart: Date;
    let periodEnd: Date;

    if (startDate && endDate) {
      // Use custom date range
      periodStart = new Date(startDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(endDate);
      periodEnd.setHours(23, 59, 59, 999);
      periodEnd.setDate(periodEnd.getDate() + 1); // Include the end date
    } else if (period === 'today') {
      periodStart = todayStart;
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (period === 'week') {
      periodStart = new Date(todayStart);
      periodStart.setDate(periodStart.getDate() - 7);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else {
      periodStart = new Date(todayStart);
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    }

    // Get all served/paid orders in the period
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.SERVED, OrderStatus.PAID] },
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Aggregate by menu item
    const itemStats: {
      [menuItemId: string]: { name: string; orderCount: number; revenue: number };
    } = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const menuItemId = item.menuItemId;
        const menuItem = item.menuItem;
        const menuItemName =
          language === 'ko'
            ? menuItem.nameKo
            : language === 'vn'
            ? menuItem.nameVn
            : menuItem.nameEn || menuItem.nameKo;

        if (!itemStats[menuItemId]) {
          itemStats[menuItemId] = {
            name: menuItemName,
            orderCount: 0,
            revenue: 0,
          };
        }
        itemStats[menuItemId].orderCount += item.quantity;
        itemStats[menuItemId].revenue += item.totalPrice;
      });
    });

    // Sort by order count and take top N
    return Object.entries(itemStats)
      .map(([menuItemId, stats]) => ({
        menuItemId,
        menuItemName: stats.name,
        orderCount: stats.orderCount,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limit);
  }

  /**
   * Get complete sales report
   */
  async getSalesReport(
    restaurantId: string,
    period: 'today' | 'week' | 'month',
    language: 'ko' | 'vn' | 'en' = 'ko',
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesReport> {
    const [statistics, hourlyOrders, categoryDistribution, topMenuItems] = await Promise.all([
      this.getSalesStatistics(restaurantId, period, startDate, endDate),
      this.getHourlyOrders(restaurantId, period, startDate, endDate),
      this.getCategoryDistribution(restaurantId, period, language, startDate, endDate),
      this.getTopMenuItems(restaurantId, period, 5, language, startDate, endDate),
    ]);

    return {
      statistics,
      hourlyOrders,
      categoryDistribution,
      topMenuItems,
    };
  }

  /**
   * Get sales history (detailed order list) for a restaurant
   */
  async getSalesHistory(
    restaurantId: string,
    period: 'today' | 'week' | 'month',
    language: 'ko' | 'vn' | 'en' = 'ko',
    startDate?: Date,
    endDate?: Date
  ): Promise<SalesHistoryEntry[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let periodStart: Date;
    let periodEnd: Date;

    if (startDate && endDate) {
      // Use custom date range
      periodStart = new Date(startDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(endDate);
      periodEnd.setHours(23, 59, 59, 999);
      periodEnd.setDate(periodEnd.getDate() + 1); // Include the end date
    } else if (period === 'today') {
      periodStart = todayStart;
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (period === 'week') {
      periodStart = new Date(todayStart);
      periodStart.setDate(periodStart.getDate() - 7);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else {
      // month
      periodStart = new Date(todayStart);
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodEnd = new Date(todayStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    }

    // Get all served/paid orders in the period
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: [OrderStatus.SERVED, OrderStatus.PAID] },
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform orders to sales history entries
    return orders.map((order, index) => {
      const menuItemName = (item: any) => {
        if (language === 'ko') return item.menuItem.nameKo;
        if (language === 'vn') return item.menuItem.nameVn;
        return item.menuItem.nameEn || item.menuItem.nameKo;
      };

      return {
        orderId: order.id,
        orderNumber: orders.length - index, // Most recent order = highest number
        sessionId: order.sessionId, // Include sessionId for grouping
        tableNumber: order.table.tableNumber,
        createdAt: order.createdAt.toISOString(),
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items.map((item) => ({
          menuItemName: menuItemName(item),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };
    });
  }
}

export const reportService = new ReportService();
