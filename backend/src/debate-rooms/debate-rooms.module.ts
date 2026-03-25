import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DebateRoomsController } from './debate-rooms.controller';
import { DebateRoomsService } from './debate-rooms.service';
import { DebateGateway } from './debate.gateway';
import { DebateAiService } from './debate-ai.service';
import { DebateMicControlService } from './debate-mic-control.service';
import { DebateTranscriptSchedulerService } from './debate-transcript-scheduler.service';
import { LivekitModule } from '../livekit/livekit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CacheModule } from '../redis/cache.module';

@Module({
  imports: [ScheduleModule, LivekitModule, NotificationsModule, CacheModule],
  controllers: [DebateRoomsController],
  providers: [
    DebateRoomsService,
    DebateGateway,
    DebateAiService,
    DebateMicControlService,
    DebateTranscriptSchedulerService,
  ],
  exports: [DebateRoomsService],
})
export class DebateRoomsModule {}
