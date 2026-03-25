import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import type { PushSubscriptionDto } from './push-notification.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotifType } from '../generated/prisma/client';
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
    @CurrentUser('dbUserId') userId: string | undefined,
    @Query('type') type?: NotifType,
    @Query('viewed') viewed?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!userId) {
      throw new NotFoundException('Authenticated user ID missing from token');
    }

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
    @CurrentUser('dbUserId') userId: string | undefined,
  ) {
    if (!userId) {
      throw new NotFoundException('Authenticated user ID missing from token');
    }

    return this.notificationsService.markNotificationAsRead(
      notificationId,
      userId,
    );
  }

  @Patch('read-all')
  async markAllNotificationsAsRead(@CurrentUser('dbUserId') userId: string | undefined) {
    if (!userId) {
      throw new NotFoundException('Authenticated user ID missing from token');
    }

    return this.notificationsService.markAllNotificationsAsRead(userId);
  }

  @Patch('read')
  async markNotificationsAsRead(
    @Body() body: MarkNotificationsReadDto,
    @CurrentUser('dbUserId') userId: string | undefined,
  ) {
    if (!userId) {
      throw new NotFoundException('Authenticated user ID missing from token');
    }

    return this.notificationsService.markNotificationsAsRead(
      body.notificationIds,
      userId,
    );
  }

  @Get('vapid-public-key')
  async getVapidPublicKey() {
    return {
      publicKey: this.pushNotificationService.getVapidPublicKey(),
    };
  }

  @Post('push/subscribe')
  async subscribeToPush(
    @CurrentUser('dbUserId') userId: string | undefined,
    @Body('subscription') subscription: PushSubscriptionDto,
  ) {
    if (!userId) {
      throw new NotFoundException('Authenticated user ID missing from token');
    }

    await this.pushNotificationService.subscribeToPush(userId, subscription);
    return { success: true };
  }

  @Delete('push/unsubscribe')
  async unsubscribeFromPush(
    @CurrentUser('dbUserId') userId: string | undefined,
    @Body('endpoint') endpoint: string,
  ) {
    if (!userId) {
      throw new NotFoundException('Authenticated user ID missing from token');
    }

    await this.pushNotificationService.unsubscribeFromPush(userId, endpoint);
    return { success: true };
  }
}
