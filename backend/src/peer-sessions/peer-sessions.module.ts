import { Module } from '@nestjs/common';
import { PeerSessionsController } from './peer-sessions.controller';
import { PeerSessionsService } from './peer-sessions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [NotificationsModule, ChatModule, AvailabilityModule],
  controllers: [PeerSessionsController],
  providers: [PeerSessionsService],
  exports: [PeerSessionsService],
})
export class PeerSessionsModule {}
