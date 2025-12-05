import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Namaste World!';
  }

  async getPlatformStats() {
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

    return {
      usersOnboarded: totalUsers,
      studyRoomsHosted: totalStudyRooms,
      sessionsCompleted: completedStudyRooms + completedPeerSessions,
      learningHours: totalHours,
      reviewsGiven: totalReviews,
    };
  }
}
