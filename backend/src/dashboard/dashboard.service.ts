/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
 
 
 
 
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DebateStatus,
  Prisma,
  SessionStatus,
} from '../generated/prisma';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';
import { EngagementService } from '../engagement/engagement.service';
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

export type ActivityFeedMode = 'for_you' | 'following';

export type ActivityFeedReason =
  | 'following'
  | 'trending'
  | 'free'
  | 'low_cost'
  | 'new'
  | 'limited_seats'
  | 'live'
  | 'upcoming'
  | 'mentor'
  | 'interest_match';

export interface ActivityFeedItem {
  id: string;
  entityId: string;
  entityType: 'study_room' | 'debate_room';
  headline: string;
  subheadline: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  topicTags: string[];
  href: string;
  ctaLabel: string;
  reasons: ActivityFeedReason[];
  trendScore: number;
  participantCount: number;
  maxParticipants: number;
  seatsLeft: number | null;
  price: number | null;
  startsAt: string | null;
  status: string;
  isLive: boolean;
  host: {
    id: string;
    name: string;
    avatar: string | null;
    isFollowed: boolean;
    avgRating: number;
    reviewCount: number;
  };
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    mode: ActivityFeedMode;
  };
}

@Injectable()
export class DashboardService {

  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
    private achievementsService: AchievementsService,
    private engagementService: EngagementService,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(DashboardService.name);
  }

  async getDashboardData(
    userId: string,
    clerkUserId: string,
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
                  OR: [{ requestedById: userId }, { requestedToId: userId }],
                  sessionStatus: SessionStatus.DONE,
                },
              }),
              // Study rooms created by user (as host)
              this.prisma.studyRoom.count({
                where: {
                  createdById: userId,
                  sessionStatus: SessionStatus.DONE,
                },
              }),
              // Study rooms user participated in (as learner)
              this.prisma.studyRoomParticipant.count({
                where: {
                  userId,
                  studyRoom: {
                    sessionStatus: SessionStatus.DONE,
                    createdById: { not: userId },
                  },
                },
              }),
              this.prisma.payment.aggregate({
                where: { receivedById: userId, paymentStatus: 'RECEIVED' },
                _sum: { amountReceived: true },
              }),
              // Use aggregation instead of fetching all reviews
              this.prisma.review.aggregate({
                where: { revieweeId: userId },
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
                  value: Math.round(Number(totalEarnings._sum.amountReceived || 0) * 100) / 100,
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
                  requestedToId: userId,
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
                  requestedById: userId,
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
              pendingPeerReviews,
              pendingStudyRoomReviews,
            ] = await Promise.all([
              // Upcoming peer sessions (including ONGOING)
              this.prisma.peerSession.findMany({
                where: {
                  OR: [{ requestedById: userId }, { requestedToId: userId }],
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
                  OR: [{ requestedById: userId }, { requestedToId: userId }],
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
                    { createdById: userId },
                    { learners: { some: { userId } } },
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
                    { createdById: userId },
                    { learners: { some: { userId } } },
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
                  OR: [{ requestedById: userId }, { requestedToId: userId }],
                  sessionStatus: { in: [SessionStatus.UPCOMING, SessionStatus.ONGOING] },
                },
              }),
              this.prisma.peerSession.count({
                where: {
                  OR: [{ requestedById: userId }, { requestedToId: userId }],
                  sessionStatus: SessionStatus.DONE,
                },
              }),
              this.prisma.studyRoom.count({
                where: {
                  OR: [
                    { createdById: userId },
                    { learners: { some: { userId } } },
                  ],
                  sessionStatus: { in: [SessionStatus.UPCOMING, SessionStatus.ONGOING] },
                },
              }),
              this.prisma.studyRoom.count({
                where: {
                  OR: [
                    { createdById: userId },
                    { learners: { some: { userId } } },
                  ],
                  sessionStatus: SessionStatus.DONE,
                },
              }),
              // Pending reviews count
              this.prisma.peerSession.count({
                where: {
                  OR: [{ requestedById: userId }, { requestedToId: userId }],
                  sessionStatus: SessionStatus.DONE,
                  reviews: { none: { reviewerId: userId } },
                },
              }),
              this.prisma.studyRoom.count({
                where: {
                  createdById: { not: userId },
                  learners: { some: { userId } },
                  sessionStatus: SessionStatus.DONE,
                  reviews: { none: { reviewerId: userId } },
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
                peer: ps.requestedById === userId ? ps.requestedTo : ps.requestedBy,
                skills: ps.skills.map((s) => s.skill),
                description: ps.description,
                requestedBy: ps.requestedBy,
                sessionStatus: ps.sessionStatus,
                hostDetailsUpdatedAt: ps.hostDetailsUpdatedAt
                  ? ps.hostDetailsUpdatedAt.toISOString()
                  : null,
                lastDetailsEditedById: ps.lastDetailsEditedById ?? null,
              })),
              pastSessions: pastSessions.map((ps) => ({
                id: ps.id,
                title: ps.title,
                date: ps.date,
                duration: ps.duration,
                peer: ps.requestedById === userId ? ps.requestedTo : ps.requestedBy,
                skills: ps.skills.map((s) => s.skill),
                description: ps.description,
                requestedBy: ps.requestedBy,
                sessionStatus: ps.sessionStatus,
                hostDetailsUpdatedAt: ps.hostDetailsUpdatedAt
                  ? ps.hostDetailsUpdatedAt.toISOString()
                  : null,
                lastDetailsEditedById: ps.lastDetailsEditedById ?? null,
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
                hostDetailsUpdatedAt: sr.hostDetailsUpdatedAt
                  ? sr.hostDetailsUpdatedAt.toISOString()
                  : null,
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
                hostDetailsUpdatedAt: sr.hostDetailsUpdatedAt
                  ? sr.hostDetailsUpdatedAt.toISOString()
                  : null,
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
              pendingReviews: pendingPeerReviews + pendingStudyRoomReviews,
            };
          };

          const getNotifications = async () => {
            if (!includeNotifications) return null;
            const blockStart = Date.now();

            const notifications = await this.prisma.notification.findMany({
              where: { userId },
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
            const streak = await this.streaksService.getUserStreak(userId);

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(`[Dashboard] Streaks block completed in ${blockDuration}ms`);

            return { streak };
          };

          const getAchievements = async () => {
            if (!includeAchievements) return null;
            const blockStart = Date.now();

            // Pass user object to avoid redundant lookup
            const achievements = await this.achievementsService.getUserAchievements(
              clerkUserId,
              userId,
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

          const getEngagement = async () => {
            const blockStart = Date.now();
            const engagement =
              await this.engagementService.getDashboardEngagement(userId);

            const blockDuration = Date.now() - blockStart;
            this.logger.debug(
              `[Dashboard] Engagement block completed in ${blockDuration}ms`,
            );

            return { engagement };
          };

          // Execute all query blocks in parallel
          const [
            metricsData,
            requestsData,
            sessionsData,
            notificationsData,
            streaksData,
            achievementsData,
            engagementData,
          ] = await Promise.all([
            getMetrics(),
            getRequests(),
            getSessions(),
            getNotifications(),
            getStreaks(),
            getAchievements(),
            getEngagement(),
          ]);

          // Combine all data
          const data: any = {
            ...metricsData,
            ...requestsData,
            ...sessionsData,
            ...notificationsData,
            ...streaksData,
            ...achievementsData,
            ...engagementData,
          };

          const totalDuration = Date.now() - startTime;
          this.logger.log({
            message: `[Dashboard] Dashboard data fetched successfully`,
            userId,
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

  async getActivityFeed(
    userId: string | undefined,
    mode: ActivityFeedMode = 'for_you',
    page: number = 1,
    limit: number = 10,
  ): Promise<ActivityFeedResponse> {
    const cacheKey = this.cacheService.createKey('dashboard:feed', {
      userId: userId || 'anonymous',
      mode,
      page,
      limit,
    });
    const cacheTTL = 30;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const studyPastCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        const debatePastCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const futureCutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const interestNames: string[] = [];
        const followingIds = new Set<string>();

        if (userId) {
          const viewer = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              userSkills: {
                include: {
                  skill: {
                    select: { name: true },
                  },
                },
              },
              following: {
                select: { followingId: true },
              },
            },
          });

          if (!viewer) {
            throw new NotFoundException('User not found');
          }

          Array.from(
            new Set(
              viewer.userSkills
                .map((userSkill) => userSkill.skill.name.trim().toLowerCase())
                .filter(Boolean),
            ),
          ).forEach(name => interestNames.push(name));
          
          viewer.following.forEach((follow) => followingIds.add(follow.followingId));
        }

        const [studyRooms, debateRooms] = await Promise.all([
          this.prisma.studyRoom.findMany({
            where: {
              sessionStatus: {
                in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
              },
              OR: [
                {
                  date: {
                    gte: studyPastCutoff,
                    lte: futureCutoff,
                  },
                },
                { sessionStatus: SessionStatus.ONGOING },
              ],
            },
            take: 60,
            orderBy: { date: 'asc' },
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  reviewsReceived: {
                    select: { rating: true },
                  },
                },
              },
              skills: {
                include: {
                  skill: {
                    select: { name: true },
                  },
                },
              },
              learners: {
                select: { id: true },
              },
            },
          }),
          this.prisma.debateRoom.findMany({
            where: {
              status: {
                in: [DebateStatus.WAITING, DebateStatus.PREP, DebateStatus.LIVE],
              },
              OR: [
                {
                  scheduledAt: {
                    gte: debatePastCutoff,
                    lte: futureCutoff,
                  },
                },
                {
                  createdAt: {
                    gte: debatePastCutoff,
                  },
                },
                {
                  status: {
                    in: [DebateStatus.PREP, DebateStatus.LIVE],
                  },
                },
              ],
            },
            take: 60,
            orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
            include: {
              host: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  reviewsReceived: {
                    select: { rating: true },
                  },
                },
              },
              teams: {
                select: {
                  participants: {
                    select: { id: true },
                  },
                },
              },
            },
          }),
        ]);

        const uniqueStudyRooms: typeof studyRooms = [];
        const seenSeries = new Set<string>();

        for (const room of studyRooms) {
          if (room.seriesId) {
            if (seenSeries.has(room.seriesId)) continue;
            seenSeries.add(room.seriesId);
          }
          uniqueStudyRooms.push(room);
        }

        const studyItems = uniqueStudyRooms
          .map((room) =>
            this.buildStudyRoomFeedItem(room, followingIds, interestNames, now),
          )
          .filter((item): item is ActivityFeedItem => Boolean(item));
        const debateItems = debateRooms
          .map((room) =>
            this.buildDebateRoomFeedItem(room, followingIds, interestNames, now),
          )
          .filter((item): item is ActivityFeedItem => Boolean(item));

        const rankedItems = [...studyItems, ...debateItems]
          .filter((item) =>
            mode === 'following' ? item.reasons.includes('following') : true,
          )
          .sort((left, right) => {
            if (right.trendScore !== left.trendScore) {
              return right.trendScore - left.trendScore;
            }

            const leftTime = left.startsAt
              ? new Date(left.startsAt).getTime()
              : Number.MAX_SAFE_INTEGER;
            const rightTime = right.startsAt
              ? new Date(right.startsAt).getTime()
              : Number.MAX_SAFE_INTEGER;
            return leftTime - rightTime;
          });

        const total = rankedItems.length;
        const safeLimit = Math.max(1, limit);
        const safePage = Math.max(1, page);
        const skip = (safePage - 1) * safeLimit;
        const pagedItems = rankedItems.slice(skip, skip + safeLimit);

        return {
          items: pagedItems,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
            hasMore: skip + safeLimit < total,
            mode,
          },
        };
      },
      cacheTTL,
    );
  }

  private toNumber(
    value: Prisma.Decimal | number | string | null | undefined,
  ): number {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }

  private averageRatings(
    reviews: Array<{ rating: number }> | undefined,
  ): { avgRating: number; reviewCount: number } {
    const safeReviews = reviews ?? [];
    const reviewCount = safeReviews.length;
    const avgRating =
      reviewCount > 0
        ? safeReviews.reduce((total, review) => total + review.rating, 0) /
          reviewCount
        : 0;

    return { avgRating, reviewCount };
  }

  private countSkillMatches(skills: string[], interests: string[]): number {
    if (skills.length === 0 || interests.length === 0) {
      return 0;
    }

    const normalizedSkills = new Set(
      skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean),
    );
    return interests.filter((interest) => normalizedSkills.has(interest)).length;
  }

  private countKeywordMatches(text: string, interests: string[]): number {
    const normalizedText = text.trim().toLowerCase();
    if (!normalizedText || interests.length === 0) {
      return 0;
    }

    return interests.filter((interest) => normalizedText.includes(interest)).length;
  }

  private buildSubheadline(parts: Array<string | null | undefined>): string {
    return parts.filter(Boolean).join(' • ');
  }

  private composeSubheadline(parts: Array<string | null | undefined>): string {
    return parts.filter(Boolean).join(' | ');
  }

  private extractTopicTags(
    source: string,
    fallback: string[] = [],
    limit: number = 3,
  ): string[] {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'that',
      'this',
      'into',
      'your',
      'will',
      'have',
      'about',
      'should',
      'would',
      'could',
      'room',
      'study',
      'debate',
    ]);

    const extracted = source
      .split(/[^a-zA-Z0-9]+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length >= 4 && !stopWords.has(token.toLowerCase()),
      );

    return Array.from(new Set([...fallback, ...extracted])).slice(0, limit);
  }

  private buildStudyRoomFeedItem(
    room: any,
    followingIds: Set<string>,
    interests: string[],
    now: Date,
  ): ActivityFeedItem | null {
    const startAt = new Date(room.date);
    const endsAt = new Date(startAt.getTime() + room.duration * 60 * 1000);
    if (endsAt.getTime() < now.getTime() - 30 * 60 * 1000) {
      return null;
    }

    const participantCount = room.learners.length;
    const seatsLeft = Math.max(room.maxParticipants - participantCount, 0);
    const price = this.toNumber(room.joiningFee);
    const isFollowed = followingIds.has(room.createdBy.id);
    const isLive =
      room.sessionStatus === SessionStatus.ONGOING ||
      (startAt.getTime() <= now.getTime() && endsAt.getTime() > now.getTime());
    const skillNames = room.skills.map((skillLink: any) => skillLink.skill.name);
    const interestMatches = this.countSkillMatches(skillNames, interests);
    const { avgRating, reviewCount } = this.averageRatings(
      room.createdBy.reviewsReceived,
    );
    const trendingThreshold = Math.max(4, Math.ceil(room.maxParticipants * 0.45));

    const reasons: ActivityFeedReason[] = [];
    if (isFollowed) reasons.push('following');
    if (isLive) reasons.push('live');
    if (participantCount >= trendingThreshold) reasons.push('trending');
    if (price === 0) reasons.push('free');
    else if (price > 0 && price <= 99) reasons.push('low_cost');
    if (seatsLeft > 0 && seatsLeft <= 2) reasons.push('limited_seats');
    if (avgRating >= 4.6 && reviewCount >= 5) reasons.push('mentor');
    if (interestMatches > 0) reasons.push('interest_match');
    if (!isLive && startAt.getTime() > now.getTime()) reasons.push('upcoming');

    const trendScore =
      participantCount * 6 +
      interestMatches * 16 +
      (isFollowed ? 90 : 0) +
      (isLive ? 34 : 0) +
      (price === 0 ? 20 : price <= 99 ? 10 : 0) +
      (seatsLeft > 0 && seatsLeft <= 2 ? 18 : 0) +
      (avgRating >= 4.6 && reviewCount >= 5 ? 15 : 0) +
      (participantCount >= trendingThreshold ? 24 : 0) -
      Math.max(0, Math.floor((startAt.getTime() - now.getTime()) / 3_600_000));

    let headline = `${room.createdBy.name} started ${room.title}`;
    if (isFollowed && isLive) {
      headline = `${room.createdBy.name} is live in ${room.title}`;
    } else if (isFollowed) {
      headline = `${room.createdBy.name} is hosting ${room.title}`;
    } else if (seatsLeft > 0 && seatsLeft <= 2) {
      headline = `Only ${seatsLeft} seats remaining in ${room.title}`;
    } else if (participantCount >= trendingThreshold) {
      headline = `Trending: ${participantCount} people joined ${room.title}`;
    } else if (price === 0) {
      headline = `₹0 Study Room - ${room.title}`;
    } else if (avgRating >= 4.6 && reviewCount >= 5) {
      headline = `${room.createdBy.name} is hosting ${room.title}`;
    } else if (isLive) {
      headline = `${room.title} is live now`;
    }

    return {
      id: `study-room:${room.id}`,
      entityId: room.id,
      entityType: 'study_room',
      headline,
      subheadline: this.composeSubheadline([
        isLive
          ? 'Live now'
          : startAt.toLocaleString('en-IN', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
        `${participantCount}/${room.maxParticipants} joined`,
        seatsLeft > 0 && seatsLeft <= 2 ? `${seatsLeft} seats left` : null,
        price === 0 ? 'Free' : `₹${price}`,
        interestMatches > 0
          ? `${interestMatches} interest match${interestMatches > 1 ? 'es' : ''}`
          : null,
      ]),
      title: room.title,
      description: room.description ?? null,
      coverImageUrl: room.imageUrl ?? null,
      topicTags: skillNames.slice(0, 3),
      href: `/studyroom/${encodeURIComponent(room.slug || room.id)}`,
      ctaLabel: isLive ? 'Join now' : 'View room',
      reasons,
      trendScore,
      participantCount,
      maxParticipants: room.maxParticipants,
      seatsLeft,
      price,
      startsAt: startAt.toISOString(),
      status: room.sessionStatus,
      isLive,
      host: {
        id: room.createdBy.id,
        name: room.createdBy.name,
        avatar: room.createdBy.avatar ?? null,
        isFollowed,
        avgRating,
        reviewCount,
      },
    };
  }

  private buildDebateRoomFeedItem(
    room: any,
    followingIds: Set<string>,
    interests: string[],
    now: Date,
  ): ActivityFeedItem | null {
    const startsAt = room.scheduledAt ? new Date(room.scheduledAt) : null;
    const participantCount = room.teams.reduce(
      (total: number, team: any) => total + team.participants.length,
      0,
    );
    const maxParticipants = room.maxParticipants * 2;
    const seatsLeft = Math.max(maxParticipants - participantCount, 0);
    const isFollowed = followingIds.has(room.host.id);
    const isLive =
      room.status === DebateStatus.LIVE || room.status === DebateStatus.PREP;
    const keywordMatches = this.countKeywordMatches(
      `${room.topic} ${room.description || ''}`,
      interests,
    );
    const { avgRating, reviewCount } = this.averageRatings(
      room.host.reviewsReceived,
    );

    const reasons: ActivityFeedReason[] = [];
    if (isFollowed) reasons.push('following');
    if (isLive) reasons.push('live');
    if (participantCount >= Math.max(4, Math.ceil(maxParticipants * 0.4))) {
      reasons.push('trending');
    }
    if (startsAt && startsAt.getTime() > now.getTime()) reasons.push('upcoming');
    if (
      room.createdAt &&
      now.getTime() - new Date(room.createdAt).getTime() <= 12 * 60 * 60 * 1000
    ) {
      reasons.push('new');
    }
    if (avgRating >= 4.6 && reviewCount >= 5) reasons.push('mentor');
    if (keywordMatches > 0) reasons.push('interest_match');

    const trendScore =
      participantCount * 7 +
      keywordMatches * 14 +
      (isFollowed ? 96 : 0) +
      (isLive ? 32 : 0) +
      (reasons.includes('trending') ? 26 : 0) +
      (reasons.includes('new') ? 16 : 0) +
      (avgRating >= 4.6 && reviewCount >= 5 ? 14 : 0);

    let headline = `${room.host.name} started a debate on ${room.topic}`;
    if (isFollowed && isLive) {
      headline = `${room.host.name} is live with ${room.topic}`;
    } else if (isFollowed && startsAt) {
      headline = `${room.host.name} scheduled a debate on ${room.topic}`;
    } else if (reasons.includes('trending')) {
      headline = `Trending: ${participantCount} people joined ${room.topic}`;
    } else if (isLive) {
      headline = `${room.topic} is live now`;
    } else if (startsAt) {
      headline = `Upcoming debate: ${room.topic}`;
    }

    const liveOrPlannedEnd = room.debateSlotEndsAt
      ? new Date(room.debateSlotEndsAt)
      : null;
    if (
      liveOrPlannedEnd &&
      liveOrPlannedEnd.getTime() < now.getTime() - 30 * 60 * 1000
    ) {
      return null;
    }

    return {
      id: `debate-room:${room.id}`,
      entityId: room.id,
      entityType: 'debate_room',
      headline,
      subheadline: this.composeSubheadline([
        isLive
          ? 'Live debate'
          : startsAt
            ? startsAt.toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'Open now',
        `${participantCount}/${maxParticipants} joined`,
        seatsLeft > 0 ? `${seatsLeft} seats left` : 'Full lobby',
        keywordMatches > 0
          ? `${keywordMatches} topic match${keywordMatches > 1 ? 'es' : ''}`
          : null,
      ]),
      title: room.topic,
      description: room.description ?? null,
      coverImageUrl: null,
      topicTags: this.extractTopicTags(room.topic, ['Debate']),
      href: `/debateroom/${room.id}`,
      ctaLabel: isLive ? 'Join debate' : 'View debate',
      reasons,
      trendScore,
      participantCount,
      maxParticipants,
      seatsLeft,
      price: 0,
      startsAt: startsAt?.toISOString() ?? room.createdAt?.toISOString() ?? null,
      status: room.status,
      isLive,
      host: {
        id: room.host.id,
        name: room.host.name,
        avatar: room.host.avatar ?? null,
        isFollowed,
        avgRating,
        reviewCount,
      },
    };
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
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days + 1);
          startDate.setHours(0, 0, 0, 0);

          // Get all completed peer sessions in the date range
          const peerSessions = await this.prisma.peerSession.findMany({
            where: {
              OR: [{ requestedById: userId }, { requestedToId: userId }],
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
                { createdById: userId },
                { learners: { some: { userId } } },
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
              if (session.requestedById === userId) {
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
              if (room.createdById === userId) {
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
          const endDate = new Date();
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - months + 1);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);

          // Get all payments in the date range
          const payments = await this.prisma.payment.findMany({
            where: {
              OR: [{ madeById: userId }, { receivedById: userId }],
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
                payment.receivedById === userId &&
                payment.paymentStatus === 'RECEIVED'
              ) {
                monthData.earned += Number(payment.amountReceived) || 0;
              }
              if (payment.madeById === userId) {
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
