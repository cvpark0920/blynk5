import webpush from 'web-push';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';

const hasVapidKeys = Boolean(config.webPush.publicKey && config.webPush.privateKey);

if (hasVapidKeys) {
  webpush.setVapidDetails(
    config.webPush.subject,
    config.webPush.publicKey,
    config.webPush.privateKey
  );
} else {
  logger.warn('Web Push VAPID keys are not configured.');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export interface SaveSubscriptionInput {
  restaurantId: string;
  staffId?: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

export class PushService {
  getPublicKey(): string {
    return config.webPush.publicKey || '';
  }

  isConfigured(): boolean {
    return hasVapidKeys;
  }

  async upsertSubscription(input: SaveSubscriptionInput) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        restaurantId: input.restaurantId,
        staffId: input.staffId || null,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent || null,
        lastSeenAt: new Date(),
      },
      create: {
        restaurantId: input.restaurantId,
        staffId: input.staffId || null,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent || null,
        lastSeenAt: new Date(),
      },
    });
  }

  async removeSubscription(endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }

  async sendToRestaurant(restaurantId: string, payload: PushPayload) {
    if (!hasVapidKeys) {
      logger.warn('Skipping push: VAPID keys missing', { restaurantId });
      return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { restaurantId },
    });

    if (subscriptions.length === 0) {
      return;
    }

    const message = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            message
          );
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            logger.info('Removing expired push subscription', { endpoint: subscription.endpoint });
            await prisma.pushSubscription.deleteMany({
              where: { endpoint: subscription.endpoint },
            });
            return;
          }
          logger.error('Failed to send push notification', {
            endpoint: subscription.endpoint,
            error: error?.message || String(error),
          });
        }
      })
    );
  }
}

export const pushService = new PushService();
