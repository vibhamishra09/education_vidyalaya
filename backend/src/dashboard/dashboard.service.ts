import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
    private achievementsService: AchievementsService,
  ) {}

  async getDashboardData(
    userId: string,
    includeMetrics: boolean = true,
    includeRequests: boolean = true,
    includeSessions: boolean = true,
    includeNotifications: boolean = true,
    includeStreaks: boolean = true,
    includeAchievements: boolean = true,
    sessionsPage: number = 1,
    sessionsLimit: number = 10,
  ) {
    console.log('includeMetrics', includeMetrics);
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const data: any = {};

    if (includeMetrics) {
      const [completedSessions, totalEarnings, receivedReviews] =
        await Promise.all([
          this.prisma.peerSession.count({
            where: {
              OR: [{ requestedById: user.id }, { requestedToId: user.id }],
              sessionStatus: SessionStatus.DONE,
            },
          }),
          this.prisma.payment.aggregate({
            where: { receivedById: user.id, paymentStatus: 'RECEIVED' },
            _sum: { amountReceived: true },
          }),
          this.prisma.review.findMany({
            where: { revieweeId: user.id },
          }),
        ]);

      const avgRating =
        receivedReviews.length > 0
          ? receivedReviews.reduce((sum, r) => sum + r.rating, 0) /
            receivedReviews.length
          : 0;

      data.metrics = [
        {
          name: 'Sessions Completed',
          value: completedSessions,
          description: 'Total sessions',
        },
        {
          name: 'Total Earnings',
          value:
            Math.round(Number(totalEarnings._sum.amountReceived || 0) * 100) /
            100,
          description: 'Coins earned',
        },
        {
          name: 'Average Rating',
          value: Math.round(avgRating * 10) / 10,
          description: 'Out of 5 stars',
        },
      ];
    }

    if (includeRequests) {
      const [pendingRequests, sentRequests] = await Promise.all([
        this.prisma.peerSession.findMany({
          where: {
            requestedToId: user.id,
            sessionStatus: SessionStatus.PENDING,
          },
          include: {
            requestedBy: { select: { id: true, name: true, avatar: true } },
            requestedTo: { select: { id: true, name: true, avatar: true } },
            skills: { include: { skill: { select: { name: true } } } },
          },
          take: 5,
        }),
        this.prisma.peerSession.findMany({
          where: {
            requestedById: user.id,
            sessionStatus: SessionStatus.PENDING,
          },
          include: {
            requestedBy: { select: { id: true, name: true, avatar: true } },
            requestedTo: { select: { id: true, name: true, avatar: true } },
            skills: { include: { skill: { select: { name: true } } } },
          },
          take: 5,
        }),
      ]);

      data.pendingRequests = pendingRequests.map((ps) => ({
        id: ps.id,
        title: ps.title,
        requestedBy: ps.requestedBy,
        requestedTo: ps.requestedTo,
        date: ps.date,
        duration: ps.duration,
        skills: ps.skills.map((s) => s.skill.name),
        direction: 'received',
      }));

      data.sentRequests = sentRequests.map((ps) => ({
        id: ps.id,
        title: ps.title,
        requestedBy: ps.requestedBy,
        requestedTo: ps.requestedTo,
        date: ps.date,
        duration: ps.duration,
        skills: ps.skills.map((s) => s.skill.name),
        direction: 'sent',
      }));
    }

    if (includeSessions) {
      const now = new Date();
      const skip = (sessionsPage - 1) * sessionsLimit;
      
      const [
        upcomingSessions,
        pastSessions,
        upcomingStudyRooms,
        pastStudyRooms,
        upcomingSessionsTotal,
        pastSessionsTotal,
        upcomingStudyRoomsTotal,
        pastStudyRoomsTotal,
      ] = await Promise.all([
        // Upcoming peer sessions (including ONGOING)
        this.prisma.peerSession.findMany({
          where: {
            OR: [{ requestedById: user.id }, { requestedToId: user.id }],
            sessionStatus: { in: [SessionStatus.UPCOMING, SessionStatus.ONGOING] },
          },
          include: {
            requestedBy: { select: { id: true, name: true, avatar: true } },
            requestedTo: { select: { id: true, name: true, avatar: true } },
            skills: {
              include: { skill: { select: { id: true, name: true } } },
            },
          },
          orderBy: { date: 'asc' }, // Sort by scheduled time
          skip,
          take: sessionsLimit,
        }),
        // Past peer sessions
        this.prisma.peerSession.findMany({
          where: {
            OR: [{ requestedById: user.id }, { requestedToId: user.id }],
            sessionStatus: SessionStatus.DONE,
          },
          include: {
            requestedBy: { select: { id: true, name: true, avatar: true } },
            requestedTo: { select: { id: true, name: true, avatar: true } },
            skills: {
              include: { skill: { select: { id: true, name: true } } },
            },
          },
          orderBy: { date: 'desc' }, // Most recent past sessions first
          skip,
          take: sessionsLimit,
        }),
        // Upcoming study rooms (including ONGOING)
        this.prisma.studyRoom.findMany({
          where: {
            OR: [
              { createdById: user.id },
              { learners: { some: { userId: user.id } } },
            ],
            sessionStatus: { in: [SessionStatus.UPCOMING, SessionStatus.ONGOING] },
          },
          include: {
            createdBy: { select: { id: true, name: true, avatar: true } },
            skills: {
              include: { skill: { select: { id: true, name: true } } },
            },
            learners: { select: { userId: true } },
          },
          orderBy: { date: 'asc' }, // Sort by scheduled time
          skip,
          take: sessionsLimit,
        }),
        // Past study rooms (DONE status)
        this.prisma.studyRoom.findMany({
          where: {
            OR: [
              { createdById: user.id },
              { learners: { some: { userId: user.id } } },
            ],
            sessionStatus: SessionStatus.DONE,
          },
          include: {
            createdBy: { select: { id: true, name: true, avatar: true } },
            skills: {
              include: { skill: { select: { id: true, name: true } } },
            },
            learners: { select: { userId: true } },
          },
          orderBy: { date: 'desc' }, // Most recent past sessions first
          skip,
          take: sessionsLimit,
        }),
        // Counts for pagination
        this.prisma.peerSession.count({
          where: {
            OR: [{ requestedById: user.id }, { requestedToId: user.id }],
            sessionStatus: { in: [SessionStatus.UPCOMING, SessionStatus.ONGOING] },
          },
        }),
        this.prisma.peerSession.count({
          where: {
            OR: [{ requestedById: user.id }, { requestedToId: user.id }],
            sessionStatus: SessionStatus.DONE,
          },
        }),
        this.prisma.studyRoom.count({
          where: {
            OR: [
              { createdById: user.id },
              { learners: { some: { userId: user.id } } },
            ],
            sessionStatus: { in: [SessionStatus.UPCOMING, SessionStatus.ONGOING] },
          },
        }),
        this.prisma.studyRoom.count({
          where: {
            OR: [
              { createdById: user.id },
              { learners: { some: { userId: user.id } } },
            ],
            sessionStatus: SessionStatus.DONE,
          },
        }),
      ]);

      data.upcomingSessions = upcomingSessions.map((ps) => ({
        id: ps.id,
        title: ps.title,
        date: ps.date,
        duration: ps.duration,
        peer: ps.requestedById === user.id ? ps.requestedTo : ps.requestedBy,
        skills: ps.skills.map((s) => s.skill),
        description: ps.description,
        requestedBy: ps.requestedBy,
        sessionStatus: ps.sessionStatus,
      }));

      data.pastSessions = pastSessions.map((ps) => ({
        id: ps.id,
        title: ps.title,
        date: ps.date,
        duration: ps.duration,
        peer: ps.requestedById === user.id ? ps.requestedTo : ps.requestedBy,
        skills: ps.skills.map((s) => s.skill),
        description: ps.description,
        requestedBy: ps.requestedBy,
        sessionStatus: ps.sessionStatus,
      }));

      data.upcomingStudyRooms = upcomingStudyRooms.map((sr) => ({
        id: sr.id,
        title: sr.title,
        date: sr.date,
        duration: sr.duration,
        maxParticipants: sr.maxParticipants,
        participantCount: sr.learners.length,
        createdBy: sr.createdBy,
        skills: sr.skills.map((s) => s.skill),
        description: sr.description,
        sessionStatus: sr.sessionStatus,
      }));

      data.pastStudyRooms = pastStudyRooms.map((sr) => ({
        id: sr.id,
        title: sr.title,
        date: sr.date,
        duration: sr.duration,
        maxParticipants: sr.maxParticipants,
        participantCount: sr.learners.length,
        createdBy: sr.createdBy,
        skills: sr.skills.map((s) => s.skill),
        description: sr.description,
        sessionStatus: sr.sessionStatus,
      }));

      // Add pagination metadata for sessions
      data.sessionsPagination = {
        upcomingSessions: {
          total: upcomingSessionsTotal,
          page: sessionsPage,
          limit: sessionsLimit,
          totalPages: Math.ceil(upcomingSessionsTotal / sessionsLimit),
          hasMore: skip + sessionsLimit < upcomingSessionsTotal,
        },
        pastSessions: {
          total: pastSessionsTotal,
          page: sessionsPage,
          limit: sessionsLimit,
          totalPages: Math.ceil(pastSessionsTotal / sessionsLimit),
          hasMore: skip + sessionsLimit < pastSessionsTotal,
        },
        upcomingStudyRooms: {
          total: upcomingStudyRoomsTotal,
          page: sessionsPage,
          limit: sessionsLimit,
          totalPages: Math.ceil(upcomingStudyRoomsTotal / sessionsLimit),
          hasMore: skip + sessionsLimit < upcomingStudyRoomsTotal,
        },
        pastStudyRooms: {
          total: pastStudyRoomsTotal,
          page: sessionsPage,
          limit: sessionsLimit,
          totalPages: Math.ceil(pastStudyRoomsTotal / sessionsLimit),
          hasMore: skip + sessionsLimit < pastStudyRoomsTotal,
        },
      };

      data.pendingReviews = await this.prisma.peerSession.count({
        where: {
          OR: [{ requestedById: user.id }, { requestedToId: user.id }],
          sessionStatus: SessionStatus.DONE,
          reviews: { none: { reviewerId: user.id } },
        },
      });
    }

    if (includeNotifications) {
      data.notifications = await this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    }

    if (includeStreaks) {
      data.streak = await this.streaksService.getUserStreak(user.id);
    }

    if (includeAchievements) {
      const achievements = await this.achievementsService.getUserAchievements(
        user.id,
      );
      data.achievements = {
        unlocked: achievements.unlocked.slice(0, 5), // Latest 5 unlocked
        inProgress: achievements.inProgress.slice(0, 3), // Top 3 in progress
        totalUnlocked: achievements.totalUnlocked,
        totalAvailable: achievements.totalAvailable,
      };
    }

    return data;
  }
}
