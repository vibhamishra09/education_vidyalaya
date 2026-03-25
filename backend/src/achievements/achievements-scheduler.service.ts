import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AchievementsService } from './achievements.service';
import { LoggerService } from '../common/logger';

@Injectable()
export class AchievementsSchedulerService {
  constructor(
    private achievementsService: AchievementsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AchievementsSchedulerService.name);
  }

  /**
   * Awards monthly "Top Learner" and "Top Teacher" badges
   * Runs on the 1st of every month at 00:01 AM
   */
  @Cron('1 0 1 * *')
  async awardMonthlyBadges() {
    const now = new Date();
    const month = now.getMonth(); // 0-11, so this is actually previous month since we're on the 1st
    const year = now.getFullYear();

    // If it's January, we need to award for December of previous year
    const targetMonth = month === 0 ? 12 : month;
    const targetYear = month === 0 ? year - 1 : year;

    this.logger.log(
      `Awarding monthly badges for ${targetYear}-${String(targetMonth).padStart(2, '0')}`,
    );

    try {
      const topUsers = await this.achievementsService.getMonthlyTopUsers(
        targetMonth,
        targetYear,
      );

      this.logger.log(
        `Top Learner: ${topUsers.topLearners[0]?.userId || 'None'}`,
      );
      this.logger.log(
        `Top Teacher: ${topUsers.topTeachers[0]?.userId || 'None'}`,
      );

      // TODO: Award special badges to these users
      // This could be a special achievement type or a separate Badge model
      // For now, this just logs the winners

      this.logger.log('Monthly badges awarded successfully');
    } catch (error) {
      this.logger.error('Failed to award monthly badges', error);
    }
  }

  /**
   * Manual trigger for testing - can be called via API endpoint if needed
   */
  async triggerMonthlyBadges(month: number, year: number) {
    this.logger.log(
      `Manually triggered monthly badges for ${year}-${String(month).padStart(2, '0')}`,
    );

    const topUsers = await this.achievementsService.getMonthlyTopUsers(
      month,
      year,
    );

    this.logger.log(
      `Top Learner: ${topUsers.topLearners[0]?.userId || 'None'}`,
    );
    this.logger.log(
      `Top Teacher: ${topUsers.topTeachers[0]?.userId || 'None'}`,
    );

    return topUsers;
  }
}
