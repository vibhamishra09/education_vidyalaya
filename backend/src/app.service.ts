import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { LoggerService } from './common/logger';
import { CacheService } from './redis/cache.service';
import { isConnectionError } from './common/db-error-handler';

@Injectable()
export class AppService {

  constructor(
    private prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(AppService.name);
  }

  getHello(): string {
    return 'Namaste World!';
  }

  async getPlatformStats() {
    const cacheKey = this.cacheService.createKey('platform:stats');
    const cacheTTL = 300; // 5 minutes - platform stats don't change frequently

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const dbStartTime = Date.now();
        this.logger.debug('[HomePage] Starting platform stats database queries');

        try {
          const [
            totalUsers,
            totalStudyRooms,
            completedStudyRooms,
            totalPeerSessions,
            completedPeerSessions,
            totalReviews,
          ] = await Promise.all([
            // Total registered users
            this.prisma.user.count(),
            // Total study rooms created
            this.prisma.studyRoom.count(),
            // Completed study rooms
            this.prisma.studyRoom.count({
              where: { sessionStatus: SessionStatus.DONE },
            }),
            // Total peer sessions
            this.prisma.peerSession.count(),
            // Completed peer sessions
            this.prisma.peerSession.count({
              where: { sessionStatus: SessionStatus.DONE },
            }),
            // Total reviews given
            this.prisma.review.count(),
          ]);

          this.logger.debug({
            message: '[HomePage] Initial counts retrieved',
            counts: {
              totalUsers,
              totalStudyRooms,
              completedStudyRooms,
              totalPeerSessions,
              completedPeerSessions,
              totalReviews,
            },
          });

          // Calculate total learning hours from completed sessions and average rating
          const [studyRoomHours, peerSessionHours, reviewStats] = await Promise.all([
            this.prisma.studyRoom.aggregate({
              where: { sessionStatus: SessionStatus.DONE },
              _sum: { duration: true },
            }),
            this.prisma.peerSession.aggregate({
              where: { sessionStatus: SessionStatus.DONE },
              _sum: { duration: true },
            }),
            // Calculate average rating from all reviews
            this.prisma.review.aggregate({
              _avg: { rating: true },
            }),
          ]);

          const totalMinutes =
            (studyRoomHours._sum.duration || 0) +
            (peerSessionHours._sum.duration || 0);
          const totalHours = Math.round(totalMinutes / 60);

          // Calculate average rating, defaulting to 0 if no reviews exist
          const averageRating = reviewStats._avg.rating
            ? Number(reviewStats._avg.rating.toFixed(1))
            : 0;

          const dbDuration = Date.now() - dbStartTime;
          this.logger.debug({
            message: '[HomePage] Platform stats database queries completed',
            dbDuration: `${dbDuration}ms`,
            learningHoursCalculation: {
              studyRoomMinutes: studyRoomHours._sum.duration || 0,
              peerSessionMinutes: peerSessionHours._sum.duration || 0,
              totalMinutes,
              totalHours,
            },
            averageRating,
          });

          const result = {
            usersOnboarded: totalUsers,
            studyRoomsHosted: totalStudyRooms,
            sessionsCompleted: completedStudyRooms + completedPeerSessions,
            learningHours: totalHours,
            reviewsGiven: totalReviews,
            averageRating,
          };

          return result;
        } catch (error) {
          const dbDuration = Date.now() - dbStartTime;
          this.logger.error({
            message: '[HomePage] Platform stats database query failed',
            dbDuration: `${dbDuration}ms`,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Return fallback data for connection errors
          if (isConnectionError(error)) {
            this.logger.warn('[HomePage] Returning fallback platform stats due to connection error');
            return {
              usersOnboarded: 0,
              studyRoomsHosted: 0,
              sessionsCompleted: 0,
              learningHours: 0,
              reviewsGiven: 0,
              averageRating: 0,
            };
          }

          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }
}
