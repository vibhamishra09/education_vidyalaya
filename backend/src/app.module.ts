import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';
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
import { StreaksModule } from './streaks/streaks.module';
import { AchievementsModule } from './achievements/achievements.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { DebugModule } from './debug/debug.module';
import { DebateRoomsModule } from './debate-rooms/debate-rooms.module';
import { DebateChatModule } from './debate-chat/debate-chat.module';
import { SessionExtensionModule } from './session-extension/session-extension.module';
import { SessionModerationModule } from './session-moderation/session-moderation.module';
import { LoggingInterceptor } from './logging.interceptor';
import { SentryModule } from './common/sentry';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    SentryModule.forRoot(),
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
    StreaksModule,
    AchievementsModule,
    TranscriptsModule,
    DebugModule,
    DebateRoomsModule,
    DebateChatModule,
    SessionExtensionModule,
    SessionModerationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register the HTTP request duration histogram
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Response time buckets in seconds
    }),
    // Register the interceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
