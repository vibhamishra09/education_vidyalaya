import { Module } from '@nestjs/common';
import { PeerSessionsController } from './peer-sessions.controller';
import { PeerSessionsService } from './peer-sessions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [NotificationsModule, ChatModule],
  controllers: [PeerSessionsController],
  providers: [PeerSessionsService],
  exports: [PeerSessionsService],
})
export class PeerSessionsModule {}
