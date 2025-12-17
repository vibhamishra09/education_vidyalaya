import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';

export interface SessionActivityDataPoint {
  date: string;
  learned: number;
  taught: number;
  studyRooms: number;
}

export interface WalletActivityDataPoint {
  month: string;
  earned: number;
  spent: number;
  net: number;
}

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
      select: { id: true, clerkId: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const data: any = {};

    if (includeMetrics) {
      const [
        completedPeerSessions,
        completedStudyRoomsAsHost,
        studyRoomsAsParticipant,
        totalEarnings,
        receivedReviews,
      ] = await Promise.all([
          // Peer sessions (as learner or teacher)
          this.prisma.peerSession.count({
            where: {
              OR: [{ requestedById: user.id }, { requestedToId: user.id }],
              sessionStatus: SessionStatus.DONE,
            },
          }),
          // Study rooms created by user (as host)
          this.prisma.studyRoom.count({
            where: {
              createdById: user.id,
              sessionStatus: SessionStatus.DONE,
            },
          }),
          // Study rooms user participated in (as learner)
          this.prisma.studyRoomParticipant.count({
            where: {
              userId: user.id,
              studyRoom: {
                sessionStatus: SessionStatus.DONE,
                createdById: { not: user.id },
              },
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

      // Total completed sessions = peer sessions + study rooms (as host) + study rooms (as participant)
      const completedSessions = completedPeerSessions + completedStudyRoomsAsHost + studyRoomsAsParticipant;

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
        user.clerkId,
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

  /**
   * Get session activity data for charts (last N days)
   */
  async getSessionActivity(
    userId: string,
    days: number = 30,
  ): Promise<SessionActivityDataPoint[]> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Get all completed peer sessions in the date range
    const peerSessions = await this.prisma.peerSession.findMany({
      where: {
        OR: [{ requestedById: user.id }, { requestedToId: user.id }],
        sessionStatus: SessionStatus.DONE,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        requestedById: true,
        requestedToId: true,
      },
    });

    // Get all completed study room sessions in the date range
    const studyRoomParticipations = await this.prisma.studyRoom.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { learners: { some: { userId: user.id } } },
        ],
        sessionStatus: SessionStatus.DONE,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        createdById: true,
      },
    });

    // Create a map for each day
    const activityMap = new Map<string, SessionActivityDataPoint>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      activityMap.set(dateStr, {
        date: dateStr,
        learned: 0,
        taught: 0,
        studyRooms: 0,
      });
    }

    // Count peer sessions
    for (const session of peerSessions) {
      const dateStr = new Date(session.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const dayData = activityMap.get(dateStr);
      if (dayData) {
        // requestedBy = learner, requestedTo = teacher
        if (session.requestedById === user.id) {
          dayData.learned++;
        } else {
          dayData.taught++;
        }
      }
    }

    // Count study room participations as taught/learned
    for (const room of studyRoomParticipations) {
      const dateStr = new Date(room.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const dayData = activityMap.get(dateStr);
      if (dayData) {
        // Count study rooms as taught (creator) or learned (participant)
        if (room.createdById === user.id) {
          dayData.taught++;
        } else {
          dayData.learned++;
        }
        dayData.studyRooms++; // Keep for backwards compatibility
      }
    }

    return Array.from(activityMap.values());
  }

  /**
   * Get wallet activity data for charts (last N months)
   */
  async getWalletActivity(
    userId: string,
    months: number = 6,
  ): Promise<WalletActivityDataPoint[]> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Get all payments in the date range
    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [{ madeById: user.id }, { receivedById: user.id }],
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amountMade: true,
        amountReceived: true,
        madeById: true,
        receivedById: true,
        paymentStatus: true,
        createdAt: true,
      },
    });

    // Create a map for each month
    const activityMap = new Map<string, WalletActivityDataPoint>();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthStr = monthNames[date.getMonth()];
      activityMap.set(monthStr, {
        month: monthStr,
        earned: 0,
        spent: 0,
        net: 0,
      });
    }

    // Aggregate payments by month
    for (const payment of payments) {
      const monthStr = monthNames[new Date(payment.createdAt).getMonth()];
      const monthData = activityMap.get(monthStr);
      if (monthData) {
        if (
          payment.receivedById === user.id &&
          payment.paymentStatus === 'RECEIVED'
        ) {
          monthData.earned += Number(payment.amountReceived) || 0;
        }
        if (payment.madeById === user.id) {
          monthData.spent += Number(payment.amountMade) || 0;
        }
      }
    }

    // Calculate net for each month
    for (const data of activityMap.values()) {
      data.net = data.earned - data.spent;
      // Round to 2 decimal places
      data.earned = Math.round(data.earned * 100) / 100;
      data.spent = Math.round(data.spent * 100) / 100;
      data.net = Math.round(data.net * 100) / 100;
    }

    return Array.from(activityMap.values());
  }
}
