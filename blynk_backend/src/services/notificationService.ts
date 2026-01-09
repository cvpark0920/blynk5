import { prisma } from '../utils/prisma';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  restaurantId: string;
  type: NotificationType;
  titleKo?: string;
  titleVn?: string;
  titleEn?: string;
  descriptionKo?: string;
  descriptionVn?: string;
  descriptionEn?: string;
  metadata?: any;
}

export class NotificationService {
  async createNotification(data: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        restaurantId: data.restaurantId,
        type: data.type,
        titleKo: data.titleKo,
        titleVn: data.titleVn,
        titleEn: data.titleEn,
        descriptionKo: data.descriptionKo,
        descriptionVn: data.descriptionVn,
        descriptionEn: data.descriptionEn,
        metadata: data.metadata || {},
        isRead: false,
      },
    });
  }

  async getNotifications(restaurantId: string, limit: number = 50) {
    return prisma.notification.findMany({
      where: { restaurantId },
      orderBy: [
        { isRead: 'asc' }, // 읽지 않음 우선
        { createdAt: 'desc' }, // 최신순
      ],
      take: limit,
    });
  }

  async markAsRead(notificationId: string, restaurantId: string) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        restaurantId, // 보안: 해당 식당의 알림만 수정 가능
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(restaurantId: string) {
    return prisma.notification.updateMany({
      where: {
        restaurantId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async getUnreadCount(restaurantId: string) {
    return prisma.notification.count({
      where: {
        restaurantId,
        isRead: false,
      },
    });
  }
}

export const notificationService = new NotificationService();
