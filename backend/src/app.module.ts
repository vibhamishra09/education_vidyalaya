import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { SkillsModule } from './skills/skills.module';
import { StudyRoomsModule } from './study-rooms/study-rooms.module';
import { PeerSessionsModule } from './peer-sessions/peer-sessions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BrowseModule } from './browse/browse.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { LivekitModule } from './livekit/livekit.module';
import { UploadModule } from './upload/upload.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    SkillsModule,
    StudyRoomsModule,
    PeerSessionsModule,
    ReviewsModule,
    NotificationsModule,
    BrowseModule,
    DashboardModule,
    PaymentsModule,
    ChatModule,
    LivekitModule,
    UploadModule,
    AvailabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
