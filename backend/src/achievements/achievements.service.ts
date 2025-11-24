import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AchievementCategory,
  AchievementRarity,
  Prisma,
} from '@prisma/client';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all achievements with user's progress
   * @param userId User ID
   * @returns Categorized achievements (unlocked, in-progress, locked)
   */
  async getUserAchievements(userId: string) {
    // Get all achievements
    const allAchievements = await this.prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { rarity: 'asc' }],
    });

    // Get user's achievement progress
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    // Create a map for quick lookup
    const userAchievementMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua]),
    );

    // Categorize achievements
    const unlocked = [];
    const inProgress = [];
    const locked = [];

    for (const achievement of allAchievements) {
      const userProgress = userAchievementMap.get(achievement.id);

      const achievementData = {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        rarity: achievement.rarity,
        maxProgress: achievement.maxProgress,
        coinReward: achievement.coinReward,
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
      throw new Error(`Achievement ${achievementId} not found`);
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

    return userAchievement;
  }

  /**
   * Unlock an achievement and award coins
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

    // Award coins to user
    if (achievement.coinReward > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          coins: {
            increment: achievement.coinReward,
          },
        },
      });

      this.logger.log(
        `Awarded ${achievement.coinReward} coins to user ${userId} for achievement ${achievement.title}`,
      );
    }

    this.logger.log(
      `User ${userId} unlocked achievement: ${achievement.title}`,
    );

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

    const studyRoomsAsParticipant = await this.prisma.studyRoomParticipant.count({
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

    const totalLearnerSessions = peerSessionsAsLearner + studyRoomsAsParticipant;
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
          const userAchievement = await this.prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: milestone.id,
              },
            },
          });

          if (!userAchievement?.unlockedAt) {
            await this.updateProgress(userId, milestone.id, totalTeacherSessions);
          }
        }
      }

      // Check 5-star ratings achievement
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
    }

    // Check social achievement (unique learners connected)
    if (role === 'teacher') {
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
    const userArray = Array.from(userStats.entries()).map(([userId, stats]) => ({
      userId,
      ...stats,
    }));

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
