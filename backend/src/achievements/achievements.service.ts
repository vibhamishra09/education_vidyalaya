import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AchievementCategory,
  AchievementRarity,
  Prisma,
} from '../generated/prisma/client';
import { LoggerService } from '../common/logger';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class AchievementsService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(AchievementsService.name);
  }

  /**
   * Get all achievements with user's progress
   * @param userId Clerk ID
   * @param dbUserId Optional database user ID to avoid redundant lookup
   * @returns Categorized achievements (unlocked, in-progress, locked)
   */
  async getUserAchievements(userId: string, dbUserId?: string) {
    // Cache for 2 minutes - achievements change when user progresses
    const cacheKey = this.cacheService.createKey('achievements:user', {
      userId,
      dbUserId: dbUserId || 'none',
    });
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          let dbUserIdFinal: string;

          // If dbUserId is provided, use it directly to avoid lookup
          if (dbUserId) {
            dbUserIdFinal = dbUserId;
          } else {
            // userId is actually Clerk ID, convert to database ID
            const user = await this.prisma.user.findUnique({
              where: { clerkId: userId },
              select: { id: true, name: true },
            });

            if (!user) {
              this.logger.warn(`User not found for clerkId: ${userId}`);
              throw new Error('User not found');
            }

            dbUserIdFinal = user.id;
          }

          // Get all achievements and user's achievement progress in parallel
          const [allAchievements, userAchievements] = await Promise.all([
            this.prisma.achievement.findMany({
              orderBy: [{ category: 'asc' }, { rarity: 'asc' }],
            }),
            this.prisma.userAchievement.findMany({
              where: { userId: dbUserIdFinal },
              include: { achievement: true },
            }),
          ]);

          // Create a map for quick lookup
          const userAchievementMap = new Map(
            userAchievements.map((ua) => [ua.achievementId, ua]),
          );

          // Categorize achievements
          type AchievementData = {
            id: string;
            title: string;
            description: string;
            icon: string;
            category: AchievementCategory;
            rarity: AchievementRarity;
            maxProgress: number;
            pointReward: number;
            progress: number;
            unlockedAt: Date | null | undefined;
          };

          const unlocked: AchievementData[] = [];
          const inProgress: AchievementData[] = [];
          const locked: AchievementData[] = [];

          for (const achievement of allAchievements) {
            const userProgress = userAchievementMap.get(achievement.id);

            const achievementData: AchievementData = {
              id: achievement.id,
              title: achievement.title,
              description: achievement.description,
              icon: achievement.icon,
              category: achievement.category,
              rarity: achievement.rarity,
              maxProgress: achievement.maxProgress,
              pointReward: achievement.pointReward,
              progress: userProgress?.progress || 0,
              unlockedAt: userProgress?.unlockedAt,
            };

            if (userProgress?.unlockedAt) {
              unlocked.push(achievementData);
            } else if (userProgress && userProgress.progress > 0) {
              inProgress.push(achievementData);
            } else {
              locked.push(achievementData);
            }
          }

          return {
            unlocked,
            inProgress,
            locked,
            totalUnlocked: unlocked.length,
            totalAvailable: allAchievements.length,
          };
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getUserAchievements for user ${userId}:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty achievements as fallback
            return {
              unlocked: [],
              inProgress: [],
              locked: [],
              totalUnlocked: 0,
              totalAvailable: 0,
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
   * Update progress for a user's achievement
   * @param userId User ID
   * @param achievementId Achievement ID
   * @param increment Amount to increment progress by
   * @returns Updated user achievement
   */
  async updateProgress(
    userId: string,
    achievementId: string,
    increment: number = 1,
  ) {
    // Get achievement details
    const achievement = await this.prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      this.logger.warn(
        `Achievement ${achievementId} not found - skipping progress update`,
      );
      return null;
    }

    // Upsert user achievement
    const userAchievement = await this.prisma.userAchievement.upsert({
      where: {
        userId_achievementId: { userId, achievementId },
      },
      update: {
        progress: {
          increment,
        },
      },
      create: {
        userId,
        achievementId,
        progress: increment,
      },
    });

    // Check if achievement should be unlocked
    if (
      !userAchievement.unlockedAt &&
      userAchievement.progress >= achievement.maxProgress
    ) {
      await this.unlockAchievement(userId, achievementId);
    }

    // Invalidate user achievements cache
    await this.cacheService.deletePattern(`achievements:user:*${userId}*`);

    return userAchievement;
  }

  /**
   * Unlock an achievement NFT and mark it as minted in the user's collection
   * @param userId User ID
   * @param achievementId Achievement ID
   */
  async unlockAchievement(userId: string, achievementId: string) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new Error(`Achievement ${achievementId} not found`);
    }

    // Update user achievement
    const userAchievement = await this.prisma.userAchievement.update({
      where: {
        userId_achievementId: { userId, achievementId },
      },
      data: {
        unlockedAt: new Date(),
        progress: achievement.maxProgress,
      },
    });

    if (achievement.pointReward > 0) {
      this.logger.log(
        `Achievement ${achievement.title} minted for user ${userId} with ${achievement.pointReward} points metadata`,
      );
    }

    this.logger.log(
      `User ${userId} unlocked achievement: ${achievement.title}`,
    );

    // Invalidate user achievements cache
    await this.cacheService.deletePattern(`achievements:user:*${userId}*`);

    return userAchievement;
  }

  /**
   * Check and update session-based achievements after session completion
   * @param userId User ID
   * @param role 'learner' or 'teacher'
   */
  async checkSessionAchievements(userId: string, role: 'learner' | 'teacher') {
    // Count total completed sessions for this user
    const peerSessionsAsLearner = await this.prisma.peerSession.count({
      where: {
        requestedById: userId,
        sessionStatus: 'DONE',
      },
    });

    const peerSessionsAsTeacher = await this.prisma.peerSession.count({
      where: {
        requestedToId: userId,
        sessionStatus: 'DONE',
      },
    });

    const studyRoomsAsParticipant =
      await this.prisma.studyRoomParticipant.count({
        where: {
          userId,
          studyRoom: {
            sessionStatus: 'DONE',
          },
        },
      });

    const studyRoomsAsHost = await this.prisma.studyRoom.count({
      where: {
        createdById: userId,
        sessionStatus: 'DONE',
      },
    });

    const totalLearnerSessions =
      peerSessionsAsLearner + studyRoomsAsParticipant;
    const totalTeacherSessions = peerSessionsAsTeacher + studyRoomsAsHost;
    const totalSessions = totalLearnerSessions + totalTeacherSessions;

    // Check milestone achievements
    const sessionMilestones = [
      { id: 'achievement_first_session', count: 1 },
      { id: 'achievement_getting_started', count: 5 },
      { id: 'achievement_regular', count: 25 },
      { id: 'achievement_dedicated', count: 50 },
      { id: 'achievement_master', count: 100 },
    ];

    for (const milestone of sessionMilestones) {
      if (totalSessions >= milestone.count) {
        try {
          const userAchievement = await this.prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: milestone.id,
              },
            },
          });

          if (!userAchievement?.unlockedAt) {
            await this.updateProgress(userId, milestone.id, totalSessions);
          }
        } catch (error) {
          this.logger.error(
            `Failed to update progress for achievement ${milestone.id}:`,
            error,
          );
          // Continue processing other achievements
        }
      }
    }

    // Check teaching achievements
    if (role === 'teacher') {
      const teachingMilestones = [
        { id: 'achievement_first_teach', count: 1 },
        { id: 'achievement_helpful_tutor', count: 10 },
      ];

      for (const milestone of teachingMilestones) {
        if (totalTeacherSessions >= milestone.count) {
          try {
            const userAchievement =
              await this.prisma.userAchievement.findUnique({
                where: {
                  userId_achievementId: {
                    userId,
                    achievementId: milestone.id,
                  },
                },
              });

            if (!userAchievement?.unlockedAt) {
              await this.updateProgress(
                userId,
                milestone.id,
                totalTeacherSessions,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to update progress for teaching achievement ${milestone.id}:`,
              error,
            );
            // Continue processing other achievements
          }
        }
      }

      // Check 5-star ratings achievement
      try {
        const fiveStarRatings = await this.prisma.review.count({
          where: {
            revieweeId: userId,
            rating: 5,
          },
        });

        if (fiveStarRatings >= 50) {
          const userAchievement = await this.prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: 'achievement_master_educator',
              },
            },
          });

          if (!userAchievement?.unlockedAt) {
            await this.updateProgress(
              userId,
              'achievement_master_educator',
              fiveStarRatings,
            );
          }
        }
      } catch (error) {
        this.logger.error('Failed to check 5-star ratings achievement:', error);
        // Continue processing
      }
    }

    // Check social achievement (unique learners connected)
    if (role === 'teacher') {
      try {
        const uniqueLearners = await this.prisma.peerSession.findMany({
          where: {
            requestedToId: userId,
            sessionStatus: 'DONE',
          },
          select: {
            requestedById: true,
          },
          distinct: ['requestedById'],
        });

        if (uniqueLearners.length >= 20) {
          const userAchievement = await this.prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: 'achievement_social_butterfly',
              },
            },
          });

          if (!userAchievement?.unlockedAt) {
            await this.updateProgress(
              userId,
              'achievement_social_butterfly',
              uniqueLearners.length,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          'Failed to check social butterfly achievement:',
          error,
        );
        // Continue processing
      }
    }
  }

  /**
   * Check and update streak-based achievements
   * @param userId User ID
   * @param currentStreak Current streak count
   */
  async checkStreakAchievements(userId: string, currentStreak: number) {
    const streakMilestones = [
      { id: 'achievement_first_step', streak: 1 },
      { id: 'achievement_building_momentum', streak: 3 },
      { id: 'achievement_week_warrior', streak: 7 },
      { id: 'achievement_dedicated_learner', streak: 14 },
      { id: 'achievement_month_master', streak: 30 },
      { id: 'achievement_unstoppable', streak: 60 },
      { id: 'achievement_legend', streak: 100 },
    ];

    for (const milestone of streakMilestones) {
      if (currentStreak >= milestone.streak) {
        try {
          const userAchievement = await this.prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: milestone.id,
              },
            },
          });

          if (!userAchievement?.unlockedAt) {
            await this.updateProgress(userId, milestone.id, currentStreak);
          }
        } catch (error) {
          this.logger.error(
            `Failed to update progress for streak achievement ${milestone.id}:`,
            error,
          );
          // Continue processing other achievements
        }
      }
    }
  }

  /**
   * Get monthly top users (for Top Learner/Teacher badges)
   * @param month Month (1-12)
   * @param year Year
   * @returns Top learners and teachers
   */
  async getMonthlyTopUsers(month: number, year: number) {
    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all daily activities for the month
    const activities = await this.prisma.dailyActivity.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        userId: true,
        minutesLearned: true,
        minutesTaught: true,
      },
    });

    // Aggregate by user
    const userStats = new Map<
      string,
      { minutesLearned: number; minutesTaught: number }
    >();

    for (const activity of activities) {
      const existing = userStats.get(activity.userId) || {
        minutesLearned: 0,
        minutesTaught: 0,
      };
      userStats.set(activity.userId, {
        minutesLearned: existing.minutesLearned + activity.minutesLearned,
        minutesTaught: existing.minutesTaught + activity.minutesTaught,
      });
    }

    // Sort and get top 3 learners and teachers
    const userArray = Array.from(userStats.entries()).map(
      ([userId, stats]) => ({
        userId,
        ...stats,
      }),
    );

    const topLearners = userArray
      .sort((a, b) => b.minutesLearned - a.minutesLearned)
      .slice(0, 3);

    const topTeachers = userArray
      .sort((a, b) => b.minutesTaught - a.minutesTaught)
      .slice(0, 3);

    return {
      topLearners,
      topTeachers,
    };
  }
}
