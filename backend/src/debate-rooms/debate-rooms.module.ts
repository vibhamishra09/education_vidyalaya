import { Module } from '@nestjs/common';
import { DebateRoomsController } from './debate-rooms.controller';
import { DebateRoomsService } from './debate-rooms.service';
import { DebateGateway } from './debate.gateway';
import { DebateAiService } from './debate-ai.service';
import { DebateMicControlService } from './debate-mic-control.service';
import { LivekitModule } from '../livekit/livekit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    LivekitModule,
    NotificationsModule,
  ],
  controllers: [DebateRoomsController],
  providers: [
    DebateRoomsService,
    DebateGateway,
    DebateAiService,
    DebateMicControlService,
  ],
  exports: [DebateRoomsService],
})
export class DebateRoomsModule {}
