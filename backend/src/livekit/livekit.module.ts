import { Module, forwardRef } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';
import { LivekitWebhooksController } from './livekit.webhooks.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudyRoomsModule } from '../study-rooms/study-rooms.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => StudyRoomsModule), UsersModule],
  controllers: [LivekitController, LivekitWebhooksController],
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
