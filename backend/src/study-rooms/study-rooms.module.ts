import { Module, forwardRef } from '@nestjs/common';
import { StudyRoomsController } from './study-rooms.controller';
import { StudyRoomsService } from './study-rooms.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { StreaksModule } from '../streaks/streaks.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => ChatModule),
    StreaksModule,
    AchievementsModule,
    TranscriptsModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [StudyRoomsController],
  providers: [StudyRoomsService],
  exports: [StudyRoomsService],
})
export class StudyRoomsModule {}
