import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateTime } from 'luxon';

@Injectable()
export class StreaksService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record a user's daily activity after a session completion
   * @param userId User ID
   * @param sessionDate Date of the session
   * @param duration Duration in minutes
   * @param role 'learner' or 'teacher'
   * @param coinsEarned Optional coins earned from the session
   */
  async updateUserActivity(
    userId: string,
    sessionDate: Date,
    duration: number,
    role: 'learner' | 'teacher',
    coinsEarned: number = 0,
  ) {
    // Get user's timezone
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const timezone = user?.timezone || 'UTC';

    // Normalize session date to midnight in user's timezone
    const normalizedDate = DateTime.fromJSDate(sessionDate)
      .setZone(timezone)
      .startOf('day')
      .toJSDate();

    // Upsert daily activity record
    const activity = await this.prisma.dailyActivity.upsert({
      where: {
        userId_date: {
          userId,
          date: normalizedDate,
        },
      },
      update: {
        sessionCount: { increment: 1 },
        minutesLearned:
          role === 'learner'
            ? { increment: duration }
            : undefined,
        minutesTaught:
          role === 'teacher'
            ? { increment: duration }
            : undefined,
        coinsEarned: { increment: coinsEarned },
      },
      create: {
        userId,
        date: normalizedDate,
        sessionCount: 1,
        minutesLearned: role === 'learner' ? duration : 0,
        minutesTaught: role === 'teacher' ? duration : 0,
        coinsEarned,
      },
    });

    // Update user's streak
    await this.updateUserStreak(userId);

    return activity;
  }

  /**
   * Calculate and update a user's current and longest streak
   * @param userId User ID
   */
  async updateUserStreak(userId: string) {
    const streak = await this.calculateStreak(userId);

    // Get current longest streak
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { longestStreak: true },
    });

    const longestStreak = Math.max(
      streak.currentStreak,
      user?.longestStreak || 0,
    );

    // Update user's streak data
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: streak.currentStreak,
        longestStreak,
        lastActivityDate: streak.lastActivityDate,
      },
    });

    return {
      currentStreak: streak.currentStreak,
      longestStreak,
      lastActivityDate: streak.lastActivityDate,
    };
  }

  /**
   * Calculate a user's current streak from DailyActivity records
   * @param userId User ID
   * @returns Current streak count and last activity date
   */
  async calculateStreak(userId: string): Promise<{
    currentStreak: number;
    lastActivityDate: Date | null;
  }> {
    // Get user's timezone
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const timezone = user?.timezone || 'UTC';

    // Get today's date in user's timezone
    const today = DateTime.now().setZone(timezone).startOf('day');

    // Fetch all daily activities for this user, ordered by date descending
    const activities = await this.prisma.dailyActivity.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (activities.length === 0) {
      return { currentStreak: 0, lastActivityDate: null };
    }

    // Convert dates to DateTime objects in user's timezone
    const activityDates = activities.map((a) =>
      DateTime.fromJSDate(a.date).setZone(timezone).startOf('day'),
    );

    const lastActivityDate = activityDates[0].toJSDate();

    // Calculate streak by counting consecutive days backwards from today
    let streak = 0;
    let checkDate = today;

    // Check if user has activity today or yesterday (to maintain streak)
    const daysSinceLastActivity = Math.floor(
      checkDate.diff(activityDates[0], 'days').days,
    );

    // If last activity was more than 1 day ago, streak is broken
    if (daysSinceLastActivity > 1) {
      return { currentStreak: 0, lastActivityDate };
    }

    // Start checking from the most recent activity date
    checkDate = activityDates[0];
    streak = 1;

    // Count consecutive days backwards
    for (let i = 1; i < activityDates.length; i++) {
      const prevDate = activityDates[i];
      const daysDiff = Math.floor(checkDate.diff(prevDate, 'days').days);

      // If the gap is exactly 1 day, continue the streak
      if (daysDiff === 1) {
        streak++;
        checkDate = prevDate;
      } else {
        // Streak is broken
        break;
      }
    }

    return {
      currentStreak: streak,
      lastActivityDate,
    };
  }

  /**
   * Get a user's streak history for the last N days
   * @param userId User ID
   * @param days Number of days to retrieve (default 14)
   * @returns Array of StreakDay objects
   */
  async getStreakHistory(userId: string, days: number = 14) {
    // Get user's timezone
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const timezone = user?.timezone || 'UTC';

    // Calculate date range in user's timezone
    const endDate = DateTime.now().setZone(timezone).startOf('day');
    const startDate = endDate.minus({ days: days - 1 });

    // Fetch activities in the date range
    const activities = await this.prisma.dailyActivity.findMany({
      where: {
        userId,
        date: {
          gte: startDate.toJSDate(),
          lte: endDate.toJSDate(),
        },
      },
      orderBy: { date: 'asc' },
    });

    // Create a map for quick lookup
    const activityMap = new Map(
      activities.map((a) => [
        DateTime.fromJSDate(a.date).setZone(timezone).toISODate(),
        a,
      ]),
    );

    // Generate array for all days in range
    type StreakDay = {
      date: Date;
      hasActivity: boolean;
      sessionCount: number;
      minutesLearned: number;
      minutesTaught: number;
    };

    const streakDays: StreakDay[] = [];
    let currentDate = startDate;

    for (let i = 0; i < days; i++) {
      const dateKey = currentDate.toISODate();
      const activity = activityMap.get(dateKey);

      streakDays.push({
        date: currentDate.toJSDate(),
        hasActivity: !!activity,
        sessionCount: activity?.sessionCount || 0,
        minutesLearned: activity?.minutesLearned || 0,
        minutesTaught: activity?.minutesTaught || 0,
      });

      currentDate = currentDate.plus({ days: 1 });
    }

    return streakDays;
  }

  /**
   * Get user's current streak data
   * @param userId User ID
   * @returns Streak information
   */
  async getUserStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
      },
    });

    if (!user) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastActivityDate: user.lastActivityDate,
    };
  }
}
