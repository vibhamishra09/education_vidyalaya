import { Module } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';
import { LivekitWebhooksController } from './livekit.webhooks.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LivekitController, LivekitWebhooksController],
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
