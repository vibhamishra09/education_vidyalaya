import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { EmailModule } from '../email/email.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { StreaksModule } from '../streaks/streaks.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    EmailModule,
    TranscriptsModule,
    StreaksModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushNotificationService,
    NotificationSchedulerService,
  ],
  exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule {}
