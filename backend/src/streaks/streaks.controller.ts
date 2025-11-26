import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/streaks')
@UseGuards(ClerkAuthGuard)
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  /**
   * Get current user's streak data
   */
  @Get('current')
  async getCurrentStreak(@CurrentUser('id') userId: string) {
    return this.streaksService.getUserStreak(userId);
  }

  /**
   * Get streak history for the last N days (default 14)
   */
  @Get('history/:days')
  async getStreakHistory(
    @CurrentUser('id') userId: string,
    @Param('days', ParseIntPipe) days: number,
  ) {
    // Limit to max 90 days
    const limitedDays = Math.min(days, 90);
    return this.streaksService.getStreakHistory(userId, limitedDays);
  }

  /**
   * Get streak history for default 14 days
   */
  @Get('history')
  async getDefaultStreakHistory(@CurrentUser('id') userId: string) {
    return this.streaksService.getStreakHistory(userId, 14);
  }
}
