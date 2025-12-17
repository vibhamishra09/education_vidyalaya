import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { EmailService } from './email.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { StreaksModule } from '../streaks/streaks.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TranscriptsModule,
    StreaksModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushNotificationService,
    EmailService,
    NotificationSchedulerService,
  ],
  exports: [NotificationsService, PushNotificationService, EmailService],
})
export class NotificationsModule {}
