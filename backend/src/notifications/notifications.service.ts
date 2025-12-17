import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifType } from '@prisma/client';
import { PushNotificationService } from './push-notification.service';
import { EmailService } from './email.service';
import { redisClient } from '../redis/redis.provider';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private pushNotificationService: PushNotificationService,
    private emailService: EmailService,
  ) {}

  // Redis client available for caching, deduplication, etc.
  private redis = redisClient;

  async getNotifications(
    userId: string,
    type?: NotifType,
    viewed?: boolean,
    page: number = 1,
    limit: number = 20,
  ) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = { userId: user.id };

    if (type) where.notifType = type;
    if (viewed !== undefined) where.viewed = viewed;

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId: user.id, viewed: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== user.id) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { viewed: true },
    });
  }

  async markAllNotificationsAsRead(userId: string) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, viewed: false },
      data: { viewed: true },
    });

    return {
      success: true,
      count: result.count,
    };
  }

  async markNotificationsAsRead(notificationIds: string[], userId: string) {
    if (!notificationIds || notificationIds.length === 0) {
      return {
        success: true,
        count: 0,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const uniqueNotificationIds = Array.from(new Set(notificationIds));

    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        id: { in: uniqueNotificationIds },
        viewed: false,
      },
      data: { viewed: true },
    });

    return {
      success: true,
      count: result.count,
    };
  }

  async createNotification(
    userId: string,
    message: string,
    type: NotifType = NotifType.NORMAL,
    options?: {
      actionType?: string;
      actionData?: Record<string, any>;
      peerSessionId?: string;
      studyRoomId?: string;
      sendPush?: boolean;
      pushTitle?: string;
    },
  ) {
    // Note: This method expects a database ID, not clerkId
    // If called from other services, they should convert clerkId to database ID first
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        message,
        notifType: type,
        createdAt: new Date(),
        actionType: options?.actionType,
        actionData: options?.actionData
          ? JSON.stringify(options.actionData)
          : undefined,
        peerSessionId: options?.peerSessionId,
        studyRoomId: options?.studyRoomId,
      },
    });

    // Send push notification if requested
    if (options?.sendPush) {
      console.log('🔔 [NotificationsService] Triggering push notification:', {
        userId,
        pushTitle: options.pushTitle || 'New Notification',
        message,
        notificationId: notification.id,
        actionType: options.actionType,
      });

      await this.pushNotificationService.sendPushNotification(
        userId,
        options.pushTitle || 'New Notification',
        message,
        {
          notificationId: notification.id,
          actionType: options.actionType,
          ...options.actionData,
        },
      );

      console.log(
        '✅ [NotificationsService] Push notification triggered successfully',
      );
    }

    // Send email notification for high priority (URGENT) notifications
    if (type === NotifType.URGENT) {
      console.log('📧 [NotificationsService] Sending email for URGENT notification:', {
        userId,
        message,
        notificationId: notification.id,
      });

      const emailSubject = options?.pushTitle || 'High Priority Notification - Webyalaya';
      await this.emailService.sendEmailNotification(
        userId,
        emailSubject,
        message,
      );

      console.log(
        '✅ [NotificationsService] Email notification sent successfully',
      );
    }

    return notification;
  }

  // Convenience method to create and send notification with push
  async createAndPushNotification(
    userId: string,
    message: string,
    pushTitle: string,
    type: NotifType = NotifType.NORMAL,
    options?: {
      actionType?: string;
      actionData?: Record<string, any>;
      peerSessionId?: string;
      studyRoomId?: string;
    },
  ) {
    return this.createNotification(userId, message, type, {
      ...options,
      sendPush: true,
      pushTitle,
    });
  }
}
