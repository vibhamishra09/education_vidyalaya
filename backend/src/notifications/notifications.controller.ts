import { Controller, Get, Patch, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import type { PushSubscriptionDto } from './push-notification.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotifType } from '@prisma/client';
import { MarkNotificationsReadDto } from './dto/notification.dto';

@Controller('api/notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private pushNotificationService: PushNotificationService,
  ) {}

  @Get()
  async getNotifications(
    @CurrentUser() userId: string,
    @Query('type') type?: NotifType,
    @Query('viewed') viewed?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const viewedBool = viewed !== undefined ? viewed === 'true' : undefined;

    return this.notificationsService.getNotifications(
      userId,
      type,
      viewedBool,
      page || 1,
      limit || 20,
    );
  }

  @Patch(':notificationId/read')
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() userId: string,
  ) {
    return this.notificationsService.markNotificationAsRead(notificationId, userId);
  }

  @Patch('read-all')
  async markAllNotificationsAsRead(@CurrentUser() userId: string) {
    return this.notificationsService.markAllNotificationsAsRead(userId);
  }

  @Patch('read')
  async markNotificationsAsRead(
    @Body() body: MarkNotificationsReadDto,
    @CurrentUser() userId: string,
  ) {
    return this.notificationsService.markNotificationsAsRead(body.notificationIds, userId);
  }

  @Get('vapid-public-key')
  async getVapidPublicKey() {
    return {
      publicKey: this.pushNotificationService.getVapidPublicKey(),
    };
  }

  @Post('push/subscribe')
  async subscribeToPush(
    @CurrentUser() userId: string,
    @Body() subscription: PushSubscriptionDto,
  ) {
    // Convert clerkId to database ID
    const user = await this.notificationsService['prisma'].user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.pushNotificationService.subscribeToPush(user.id, subscription);
    return { success: true };
  }

  @Delete('push/unsubscribe')
  async unsubscribeFromPush(
    @CurrentUser() userId: string,
    @Body('endpoint') endpoint: string,
  ) {
    // Convert clerkId to database ID
    const user = await this.notificationsService['prisma'].user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.pushNotificationService.unsubscribeFromPush(user.id, endpoint);
    return { success: true };
  }
}
