import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/streaks')
@UseGuards(ClerkAuthGuard)
export class StreaksController {
  private readonly logger = new Logger(StreaksController.name);

  constructor(
    private readonly streaksService: StreaksService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get current user's streak data
   */
  @Get('current')
  async getCurrentStreak(@CurrentUser('id') clerkUserId: string) {
    this.logger.debug(
      '🔍 [StreaksController.getCurrentStreak] Called for clerkUserId:',
      clerkUserId,
    );

    // Convert Clerk ID to database ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, name: true },
    });

    if (!user) {
      this.logger.debug(
        '❌ [StreaksController.getCurrentStreak] User not found for clerkId:',
        clerkUserId,
      );
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    const result = await this.streaksService.getUserStreak(user.id);
    return result;
  }

  /**
   * Get streak history for the last N days (default 14)
   */
  @Get('history/:days')
  async getStreakHistory(
    @CurrentUser('id') clerkUserId: string,
    @Param('days', ParseIntPipe) days: number,
  ) {
    // Convert Clerk ID to database ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return { days: [] };
    }

    // Limit to max 90 days
    const limitedDays = Math.min(days, 90);
    return this.streaksService.getStreakHistory(user.id, limitedDays);
  }

  /**
   * Get streak history for default 14 days
   */
  @Get('history')
  async getDefaultStreakHistory(@CurrentUser('id') clerkUserId: string) {
    // Convert Clerk ID to database ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return { days: [] };
    }

    return this.streaksService.getStreakHistory(user.id, 14);
  }
}
