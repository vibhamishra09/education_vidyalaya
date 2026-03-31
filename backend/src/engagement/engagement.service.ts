import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Prisma, UserRewardEvent } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger';
import { CacheService } from '../redis/cache.service';

export const ENGAGEMENT_REWARD_VALUES = {
  DAILY_FIRST_ACTION: 12,
  WEEKLY_FIRST_TEACHING_SESSION: 18,
  REVIEW_COMPLETION: 8,
} as const;

export type DashboardMissionStatus = 'ready' | 'completed' | 'locked';

export interface DashboardMission {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  status: DashboardMissionStatus;
  progressLabel: string;
  actionLabel: string;
  actionHref: string;
}

export interface RewardActivityItem {
  id: string;
  rewardType: string;
  title: string;
  description: string | null;
  pointsAmount: number;
  createdAt: Date;
}

export interface DashboardEngagementSummary {
  headline: string;
  subtitle: string;
  completedCount: number;
  totalCount: number;
  weeklyPoints: number;
  totalPoints: number;
  missions: DashboardMission[];
  recentRewards: RewardActivityItem[];
}

type RewardGrantInput = {
  userId: string;
  rewardType: string;
  periodKey: string;
  title: string;
  description: string;
  pointsAmount: number;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(EngagementService.name);
  }

  async awardFirstMeaningfulActionBonus(
    userId: string,
    occurredAt: Date,
    source: 'session_completion' | 'review_submission',
  ) {
    const timezone = await this.getUserTimezone(userId);
    const periodKey = this.getDayKey(occurredAt, timezone);

    return this.grantReward({
      userId,
      rewardType: 'DAILY_FIRST_ACTION',
      periodKey,
      title: 'Daily Spark Bonus',
      description:
        'You earned today\'s first-action points bonus for showing up and making progress.',
      pointsAmount: ENGAGEMENT_REWARD_VALUES.DAILY_FIRST_ACTION,
      metadata: { source, timezone, occurredAt: occurredAt.toISOString() },
    });
  }

  async awardFirstTeachingSessionOfWeekBonus(userId: string, occurredAt: Date) {
    const timezone = await this.getUserTimezone(userId);
    const periodKey = this.getWeekKey(occurredAt, timezone);

    return this.grantReward({
      userId,
      rewardType: 'WEEKLY_FIRST_TEACHING_SESSION',
      periodKey,
      title: 'Weekly Teaching Boost',
      description:
        'You locked in your first teaching-session points bonus for this week.',
      pointsAmount: ENGAGEMENT_REWARD_VALUES.WEEKLY_FIRST_TEACHING_SESSION,
      metadata: { timezone, occurredAt: occurredAt.toISOString() },
    });
  }

  async awardReviewCompletionBonus(
    userId: string,
    sessionId: string,
    sessionType: 'studyRoom' | 'peerSession',
  ) {
    return this.grantReward({
      userId,
      rewardType: 'REVIEW_COMPLETION',
      periodKey: `${sessionType}:${sessionId}`,
      title: 'Feedback Finisher Bonus',
      description:
        'Thanks for closing the loop with a review. Helpful feedback keeps the community strong.',
      pointsAmount: ENGAGEMENT_REWARD_VALUES.REVIEW_COMPLETION,
      metadata: { sessionId, sessionType },
    });
  }

  async getDashboardEngagement(userId: string): Promise<DashboardEngagementSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const timezone = user?.timezone || 'UTC';
    const now = DateTime.now().setZone(timezone);
    const todayKey = this.getDayKey(now.toJSDate(), timezone);
    const weekKey = this.getWeekKey(now.toJSDate(), timezone);
    const startOfWeekUtc = now.startOf('week').toUTC().toJSDate();

    const [
      recentRewards,
      todayReward,
      weeklyTeachingReward,
      weekPointsAggregate,
      totalPointsAggregate,
      pendingPeerReviews,
      pendingStudyRoomReviews,
    ] =
      await Promise.all([
        this.prisma.userRewardEvent.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 4,
        }),
        this.prisma.userRewardEvent.findUnique({
          where: {
            userId_rewardType_periodKey: {
              userId,
              rewardType: 'DAILY_FIRST_ACTION',
              periodKey: todayKey,
            },
          },
        }),
        this.prisma.userRewardEvent.findUnique({
          where: {
            userId_rewardType_periodKey: {
              userId,
              rewardType: 'WEEKLY_FIRST_TEACHING_SESSION',
              periodKey: weekKey,
            },
          },
        }),
        this.prisma.userRewardEvent.aggregate({
          where: {
            userId,
            createdAt: { gte: startOfWeekUtc },
          },
          _sum: { coinAmount: true },
        }),
        this.prisma.userRewardEvent.aggregate({
          where: { userId },
          _sum: { coinAmount: true },
        }),
        this.prisma.peerSession.count({
          where: {
            OR: [{ requestedById: userId }, { requestedToId: userId }],
            sessionStatus: 'DONE',
            reviews: { none: { reviewerId: userId } },
          },
        }),
        this.prisma.studyRoom.count({
          where: {
            createdById: { not: userId },
            learners: { some: { userId } },
            sessionStatus: 'DONE',
            reviews: { none: { reviewerId: userId } },
          },
        }),
      ]);

    const pendingReviews = pendingPeerReviews + pendingStudyRoomReviews;
    const hasRecentReviewReward = recentRewards.some(
      (reward) => reward.rewardType === 'REVIEW_COMPLETION',
    );

    const missions: DashboardMission[] = [
      {
        id: 'daily-first-action',
        title: 'Daily Spark',
        description: todayReward
          ? 'Today\'s quick-win points bonus is already banked.'
          : 'Complete one meaningful action today to unlock an instant points bonus.',
        rewardPoints: ENGAGEMENT_REWARD_VALUES.DAILY_FIRST_ACTION,
        status: todayReward ? 'completed' : 'ready',
        progressLabel: todayReward ? 'Claimed today' : 'Complete 1 session or review',
        actionLabel: todayReward ? 'Keep going' : 'Explore sessions',
        actionHref: '/browse',
      },
      {
        id: 'weekly-first-teach',
        title: 'Weekly Teaching Boost',
        description: weeklyTeachingReward
          ? 'Your first teaching session points bonus for the week is secured.'
          : 'Teach once this week to collect a premium momentum reward.',
        rewardPoints: ENGAGEMENT_REWARD_VALUES.WEEKLY_FIRST_TEACHING_SESSION,
        status: weeklyTeachingReward ? 'completed' : 'ready',
        progressLabel: weeklyTeachingReward ? 'Claimed this week' : 'Complete 1 teaching session',
        actionLabel: weeklyTeachingReward ? 'Host another room' : 'Create room',
        actionHref: '/create-study-room',
      },
      {
        id: 'review-finisher',
        title: 'Feedback Finisher',
        description:
          pendingReviews > 0
            ? `You have ${pendingReviews} review${pendingReviews > 1 ? 's' : ''} that can turn into bonus points.`
            : hasRecentReviewReward
              ? 'You recently earned a review points bonus. More unlock when new completed sessions need feedback.'
              : 'No reviews are pending right now. This bonus appears when a completed session is waiting for your feedback.',
        rewardPoints: ENGAGEMENT_REWARD_VALUES.REVIEW_COMPLETION,
        status:
          pendingReviews > 0
            ? 'ready'
            : hasRecentReviewReward
              ? 'completed'
              : 'locked',
        progressLabel:
          pendingReviews > 0
            ? `${pendingReviews} review${pendingReviews > 1 ? 's' : ''} pending`
            : hasRecentReviewReward
              ? 'Recently claimed'
              : 'Waiting for completed session',
        actionLabel: pendingReviews > 0 ? 'Leave review' : 'View history',
        actionHref: '/profile?tab=sessions',
      },
    ];

    const completedCount = missions.filter(
      (mission) => mission.status === 'completed',
    ).length;

    return {
      headline: todayReward
        ? 'Momentum secured for today'
        : 'Start today with a quick win',
      subtitle: todayReward
        ? 'Nice. You\'ve already unlocked today\'s points bonus. Keep stacking rewards with teaching and reviews.'
        : 'Knock out one meaningful action to earn instant points and build your return habit.',
      completedCount,
      totalCount: missions.length,
      weeklyPoints: weekPointsAggregate._sum.coinAmount || 0,
      totalPoints: totalPointsAggregate._sum.coinAmount || 0,
      missions,
      recentRewards: recentRewards.map((reward) => ({
        id: reward.id,
        rewardType: reward.rewardType,
        title: reward.title,
        description: reward.description,
        pointsAmount: reward.coinAmount,
        createdAt: reward.createdAt,
      })),
    };
  }

  private async grantReward(input: RewardGrantInput): Promise<UserRewardEvent | null> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.userRewardEvent.findUnique({
          where: {
            userId_rewardType_periodKey: {
              userId: input.userId,
              rewardType: input.rewardType,
              periodKey: input.periodKey,
            },
          },
        });

        if (existing) {
          return { reward: existing, awarded: false };
        }

        const reward = await tx.userRewardEvent.create({
          data: {
            userId: input.userId,
            rewardType: input.rewardType,
            periodKey: input.periodKey,
            title: input.title,
            description: input.description,
            coinAmount: input.pointsAmount,
            metadata: input.metadata,
          },
        });

        return { reward, awarded: true };
      });

      if (result.awarded) {
        await this.invalidateRewardCaches(input.userId);
        this.logger.log({
          message: 'Engagement reward granted',
          userId: input.userId,
          rewardType: input.rewardType,
          periodKey: input.periodKey,
          pointsAmount: input.pointsAmount,
        });
      }

      return result.reward;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }

      this.logger.error(
        'Failed to grant engagement reward',
        error instanceof Error ? error.stack : undefined,
        JSON.stringify({
          userId: input.userId,
          rewardType: input.rewardType,
          periodKey: input.periodKey,
        }),
      );
      throw error;
    }
  }

  private async invalidateRewardCaches(userId: string) {
    await Promise.all([
      this.cacheService.deletePattern(`dashboard:data:*${userId}*`),
    ]);
  }

  private async getUserTimezone(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    return user?.timezone || 'UTC';
  }

  private getDayKey(date: Date, timezone: string) {
    return DateTime.fromJSDate(date).setZone(timezone).toFormat('yyyy-LL-dd');
  }

  private getWeekKey(date: Date, timezone: string) {
    const zoned = DateTime.fromJSDate(date).setZone(timezone);
    return `${zoned.weekYear}-W${String(zoned.weekNumber).padStart(2, '0')}`;
  }
}
