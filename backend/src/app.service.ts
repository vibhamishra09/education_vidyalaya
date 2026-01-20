import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Namaste World!';
  }

  async getPlatformStats() {
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

      // Calculate total learning hours from completed sessions
      const [studyRoomHours, peerSessionHours] = await Promise.all([
        this.prisma.studyRoom.aggregate({
          where: { sessionStatus: SessionStatus.DONE },
          _sum: { duration: true },
        }),
        this.prisma.peerSession.aggregate({
          where: { sessionStatus: SessionStatus.DONE },
          _sum: { duration: true },
        }),
      ]);

      const totalMinutes =
        (studyRoomHours._sum.duration || 0) +
        (peerSessionHours._sum.duration || 0);
      const totalHours = Math.round(totalMinutes / 60);

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
      });

      const result = {
        usersOnboarded: totalUsers,
        studyRoomsHosted: totalStudyRooms,
        sessionsCompleted: completedStudyRooms + completedPeerSessions,
        learningHours: totalHours,
        reviewsGiven: totalReviews,
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
      throw error;
    }
  }
}
