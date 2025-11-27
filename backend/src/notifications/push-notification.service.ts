import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidSubject = this.configService.get<string>('VAPID_SUBJECT', 'mailto:admin@webyalaya.com');

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey,
      );
    } else {
      this.logger.warn('VAPID keys not configured. Push notifications will not work.');
    }
  }

  async subscribeToPush(userId: string, subscription: PushSubscriptionDto) {
    try {
      // Check if subscription already exists
      const existing = await this.prisma.pushSubscription.findFirst({
        where: {
          userId,
          endpoint: subscription.endpoint,
        },
      });

      if (existing) {
        // Update existing subscription
        return await this.prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        });
      }

      // Create new subscription
      return await this.prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
    } catch (error) {
      this.logger.error('Error subscribing to push notifications', error);
      throw error;
    }
  }

  async unsubscribeFromPush(userId: string, endpoint: string) {
    try {
      await this.prisma.pushSubscription.deleteMany({
        where: {
          userId,
          endpoint,
        },
      });
      return { success: true };
    } catch (error) {
      this.logger.error('Error unsubscribing from push notifications', error);
      throw error;
    }
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    try {
      console.log('🔔 [PushNotificationService] Sending push notification:', {
        userId,
        title,
        body,
        data,
      });

      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId },
      });

      console.log(`📱 [PushNotificationService] Found ${subscriptions.length} subscription(s) for user ${userId}`);

      if (subscriptions.length === 0) {
        console.warn(`⚠️  [PushNotificationService] No push subscriptions found for user ${userId}`);
        this.logger.debug(`No push subscriptions found for user ${userId}`);
        return { sent: 0 };
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: data || {},
      });

      const sendPromises = subscriptions.map(async (subscription, index) => {
        try {
          console.log(`📤 [PushNotificationService] Sending to subscription ${index + 1}/${subscriptions.length}:`, {
            endpoint: subscription.endpoint.substring(0, 50) + '...',
          });

          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
          );

          console.log(`✅ [PushNotificationService] Successfully sent push ${index + 1}/${subscriptions.length}`);
          return true;
        } catch (error: any) {
          console.error(`❌ [PushNotificationService] Failed to send push ${index + 1}/${subscriptions.length}:`, error.message);
          
          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`🗑️  [PushNotificationService] Removing invalid subscription (${error.statusCode})`);
            this.logger.debug(`Removing invalid subscription for user ${userId}`);
            await this.prisma.pushSubscription.delete({
              where: { id: subscription.id },
            });
          } else {
            this.logger.error('Error sending push notification', error);
          }
          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      const sentCount = results.filter((r) => r).length;

      console.log(`🎯 [PushNotificationService] Push notification summary: ${sentCount}/${subscriptions.length} sent successfully`);
      this.logger.log(`Sent ${sentCount} push notifications to user ${userId}`);
      return { sent: sentCount };
    } catch (error) {
      this.logger.error('Error sending push notifications', error);
      throw error;
    }
  }

  async sendPushToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const results = await Promise.all(
      userIds.map((userId) => this.sendPushNotification(userId, title, body, data)),
    );

    const totalSent = results.reduce((sum, result) => sum + result.sent, 0);
    return { sent: totalSent };
  }

  getVapidPublicKey(): string | undefined {
    return this.configService.get<string>('VAPID_PUBLIC_KEY');
  }
}
