/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionStatus } from '../generated/prisma/client';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';
import { LoggerService } from '../common/logger';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';

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
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(DashboardService.name);
  }

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
    // Cache for 30 seconds - dashboard data changes frequently
    const cacheKey = this.cacheService.createKey('dashboard:data', {
      userId,
      includeMetrics,
      includeRequests,
      includeSessions,
      includeNotifications,
      includeStreaks,
      includeAchievements,
      sessionsPage,
      sessionsLimit,
    });
    const cacheTTL = 30;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const startTime = Date.now();
          this.logger.debug(`[Dashboard] Fetching dashboard data for user: ${userId}`);

          // userId is actually clerkId, so we need to find the user by clerkId first
          const user = await this.prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true, clerkId: true },
          });

          if (!user) {
            throw new NotFoundException(
              'User not found. Please complete onboarding first.',
            );
          }

          // Helper functions for each data block
          const getMetrics = async () => {
            if (!includeMetrics) return null;
            const blockStart = Date.now();

            const [
              completedPeerSessions,
              completedStudyRoomsAsHost,
              studyRoomsAsParticipant,
              totalEarnings,
              reviewStats,
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
              // Use aggregation instead of fetching all reviews
              this.prisma.review.aggregate({
                where: { revieweeId: user.id },
                _avg: { rating: true },
                _count: true,
              }),
            ]);

            const completedSessions = completedPeerSessions + completedStudyRoomsAsHost + studyRoomsAsParticipant;
            const avgRating = reviewStats._avg.rating ? Number(reviewStats._avg.rating) : 0;

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(`[Dashboard] Metrics block completed in ${blockDuration}ms`);

            return {
              metrics: [
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
              ],
            };
          };

          const getRequests = async () => {
            if (!includeRequests) return null;
            const blockStart = Date.now();

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

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(`[Dashboard] Requests block completed in ${blockDuration}ms`);

            return {
              pendingRequests: pendingRequests.map((ps) => ({
                id: ps.id,
                title: ps.title,
                requestedBy: ps.requestedBy,
                requestedTo: ps.requestedTo,
                date: ps.date,
                duration: ps.duration,
                skills: ps.skills.map((s) => s.skill.name),
                direction: 'received',
              })),
              sentRequests: sentRequests.map((ps) => ({
                id: ps.id,
                title: ps.title,
                requestedBy: ps.requestedBy,
                requestedTo: ps.requestedTo,
                date: ps.date,
                duration: ps.duration,
                skills: ps.skills.map((s) => s.skill.name),
                direction: 'sent',
              })),
            };
          };

          const getSessions = async () => {
            if (!includeSessions) return null;
            const blockStart = Date.now();
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
              pendingReviews,
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
                orderBy: { date: 'asc' },
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
                orderBy: { date: 'desc' },
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
                orderBy: { date: 'asc' },
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
                orderBy: { date: 'desc' },
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
              // Pending reviews count
              this.prisma.peerSession.count({
                where: {
                  OR: [{ requestedById: user.id }, { requestedToId: user.id }],
                  sessionStatus: SessionStatus.DONE,
                  reviews: { none: { reviewerId: user.id } },
                },
              }),
            ]);

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(`[Dashboard] Sessions block completed in ${blockDuration}ms`);

            return {
              upcomingSessions: upcomingSessions.map((ps) => ({
                id: ps.id,
                title: ps.title,
                date: ps.date,
                duration: ps.duration,
                peer: ps.requestedById === user.id ? ps.requestedTo : ps.requestedBy,
                skills: ps.skills.map((s) => s.skill),
                description: ps.description,
                requestedBy: ps.requestedBy,
                sessionStatus: ps.sessionStatus,
              })),
              pastSessions: pastSessions.map((ps) => ({
                id: ps.id,
                title: ps.title,
                date: ps.date,
                duration: ps.duration,
                peer: ps.requestedById === user.id ? ps.requestedTo : ps.requestedBy,
                skills: ps.skills.map((s) => s.skill),
                description: ps.description,
                requestedBy: ps.requestedBy,
                sessionStatus: ps.sessionStatus,
              })),
              upcomingStudyRooms: upcomingStudyRooms.map((sr) => ({
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
                slug: sr.slug
              })),
              pastStudyRooms: pastStudyRooms.map((sr) => ({
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
                slug: sr.slug
              })),
              sessionsPagination: {
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
              },
              pendingReviews,
            };
          };

          const getNotifications = async () => {
            if (!includeNotifications) return null;
            const blockStart = Date.now();

            const notifications = await this.prisma.notification.findMany({
              where: { userId: user.id },
              orderBy: { createdAt: 'desc' },
              take: 5,
            });

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(`[Dashboard] Notifications block completed in ${blockDuration}ms`);

            return { notifications };
          };

          const getStreaks = async () => {
            if (!includeStreaks) return null;
            const blockStart = Date.now();

            // Pass user.id directly to avoid redundant lookup
            const streak = await this.streaksService.getUserStreak(user.id);

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(`[Dashboard] Streaks block completed in ${blockDuration}ms`);

            return { streak };
          };

          const getAchievements = async () => {
            if (!includeAchievements) return null;
            const blockStart = Date.now();

            // Pass user object to avoid redundant lookup
            const achievements = await this.achievementsService.getUserAchievements(
              user.clerkId,
              user.id, // Pass dbUserId to avoid lookup
            );

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(`[Dashboard] Achievements block completed in ${blockDuration}ms`);

            return {
              achievements: {
                unlocked: achievements.unlocked.slice(0, 5),
                inProgress: achievements.inProgress.slice(0, 3),
                totalUnlocked: achievements.totalUnlocked,
                totalAvailable: achievements.totalAvailable,
              },
            };
          };

          // Execute all query blocks in parallel
          const [
            metricsData,
            requestsData,
            sessionsData,
            notificationsData,
            streaksData,
            achievementsData,
          ] = await Promise.all([
            getMetrics(),
            getRequests(),
            getSessions(),
            getNotifications(),
            getStreaks(),
            getAchievements(),
          ]);

          // Combine all data
          const data: any = {
            ...metricsData,
            ...requestsData,
            ...sessionsData,
            ...notificationsData,
            ...streaksData,
            ...achievementsData,
          };

          const totalDuration = Date.now() - startTime;
          this.logger.log({
            message: `[Dashboard] Dashboard data fetched successfully`,
            userId: user.id,
            duration: `${totalDuration}ms`,
            includes: {
              metrics: includeMetrics,
              requests: includeRequests,
              sessions: includeSessions,
              notifications: includeNotifications,
              streaks: includeStreaks,
              achievements: includeAchievements,
            },
          });

          return data;
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getDashboardData for user ${userId}:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty dashboard data as fallback
            return {
              metrics: includeMetrics ? [] : null,
              requests: includeRequests ? [] : null,
              sessions: includeSessions ? { items: [], pagination: { total: 0, page: sessionsPage, limit: sessionsLimit, totalPages: 0, hasMore: false } } : null,
              notifications: includeNotifications ? [] : null,
              streaks: includeStreaks ? null : null,
              achievements: includeAchievements ? [] : null,
            };
          }

          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }

  /**
   * Get session activity data for charts (last N days)
   */
  async getSessionActivity(
    userId: string,
    days: number = 30,
  ): Promise<SessionActivityDataPoint[]> {
    // Cache for 2 minutes - activity data changes when sessions complete
    const cacheKey = this.cacheService.createKey('dashboard:session-activity', {
      userId,
      days,
    });
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const user = await this.prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true },
          });

          if (!user) {
            throw new NotFoundException(
              'User not found. Please complete onboarding first.',
            );
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
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getSessionActivity for user ${userId}:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty activity data as fallback
            return [];
          }

          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }

  /**
   * Get wallet activity data for charts (last N months)
   */
  async getWalletActivity(
    userId: string,
    months: number = 6,
  ): Promise<WalletActivityDataPoint[]> {
    // Cache for 2 minutes - wallet activity changes when payments are made
    const cacheKey = this.cacheService.createKey('dashboard:wallet-activity', {
      userId,
      months,
    });
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const user = await this.prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true },
          });

          if (!user) {
            throw new NotFoundException(
              'User not found. Please complete onboarding first.',
            );
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
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getWalletActivity for user ${userId}:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty wallet activity data as fallback
            return [];
          }

          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }
}
