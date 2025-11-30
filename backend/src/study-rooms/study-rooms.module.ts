import { Module } from '@nestjs/common';
import { StudyRoomsController } from './study-rooms.controller';
import { StudyRoomsService } from './study-rooms.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { StreaksModule } from '../streaks/streaks.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';

@Module({
  imports: [
    NotificationsModule,
    ChatModule,
    StreaksModule,
    AchievementsModule,
    TranscriptsModule,
  ],
  controllers: [StudyRoomsController],
  providers: [StudyRoomsService],
  exports: [StudyRoomsService],
})
export class StudyRoomsModule {}
