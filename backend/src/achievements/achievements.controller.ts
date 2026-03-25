import { Controller, Get, UseGuards } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/achievements')
@UseGuards(ClerkAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  /**
   * Get all achievements with user's progress
   */
  @Get()
  async getUserAchievements(
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
  ) {
    const result = await this.achievementsService.getUserAchievements(
      clerkUserId,
      dbUserId,
    );
    return result;
  }

  /**
   * Get only unlocked achievements
   */
  @Get('unlocked')
  async getUnlockedAchievements(
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
  ) {
    const data = await this.achievementsService.getUserAchievements(
      clerkUserId,
      dbUserId,
    );
    return {
      achievements: data.unlocked,
      total: data.totalUnlocked,
    };
  }

  /**
   * Get achievements in progress
   */
  @Get('progress')
  async getInProgressAchievements(
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
  ) {
    const data = await this.achievementsService.getUserAchievements(
      clerkUserId,
      dbUserId,
    );
    return {
      achievements: data.inProgress,
      total: data.inProgress.length,
    };
  }

  /**
   * Get monthly top users
   */
  @Get('monthly-top')
  async getMonthlyTopUsers() {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const year = now.getFullYear();

    return this.achievementsService.getMonthlyTopUsers(month, year);
  }
}
