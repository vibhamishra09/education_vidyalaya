import { Module, forwardRef } from '@nestjs/common';
import { PeerSessionsController } from './peer-sessions.controller';
import { PeerSessionsService } from './peer-sessions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { AvailabilityModule } from '../availability/availability.module';
import { StreaksModule } from '../streaks/streaks.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => ChatModule),
    AvailabilityModule,
    StreaksModule,
    AchievementsModule,
    TranscriptsModule,
  ],
  controllers: [PeerSessionsController],
  providers: [PeerSessionsService],
  exports: [PeerSessionsService],
})
export class PeerSessionsModule {}
