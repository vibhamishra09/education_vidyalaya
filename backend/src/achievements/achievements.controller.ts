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
  async getUserAchievements(@CurrentUser('id') userId: string) {
    console.log('[AchievementsController] Getting achievements for user:', userId);
    const result = await this.achievementsService.getUserAchievements(userId);
    console.log('[AchievementsController] Result:', {
      totalUnlocked: result.totalUnlocked,
      unlockedCount: result.unlocked.length,
      inProgressCount: result.inProgress.length,
      lockedCount: result.locked.length,
      sampleUnlocked: result.unlocked[0] ? {
        id: result.unlocked[0].id,
        title: result.unlocked[0].title,
        unlockedAt: result.unlocked[0].unlockedAt,
      } : 'none',
    });
    return result;
  }

  /**
   * Get only unlocked achievements
   */
  @Get('unlocked')
  async getUnlockedAchievements(@CurrentUser('id') userId: string) {
    const data = await this.achievementsService.getUserAchievements(userId);
    return {
      achievements: data.unlocked,
      total: data.totalUnlocked,
    };
  }

  /**
   * Get achievements in progress
   */
  @Get('progress')
  async getInProgressAchievements(@CurrentUser('id') userId: string) {
    const data = await this.achievementsService.getUserAchievements(userId);
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
