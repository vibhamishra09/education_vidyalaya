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

  @Get('current')
  async getCurrentStreak(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    const resolvedDbUserId = dbUserId ?? (await this.resolveDbUserId(clerkUserId));
    this.logger.debug('[StreaksController.getCurrentStreak] Called', { resolvedDbUserId });

    if (!resolvedDbUserId) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    return this.streaksService.getUserStreak(resolvedDbUserId);
  }

  @Get('history/:days')
  async getStreakHistory(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Param('days', ParseIntPipe) days: number,
  ) {
    const resolvedDbUserId = dbUserId ?? (await this.resolveDbUserId(clerkUserId));
    if (!resolvedDbUserId) {
      return { days: [] };
    }

    return this.streaksService.getStreakHistory(resolvedDbUserId, Math.min(days, 90));
  }

  @Get('history')
  async getDefaultStreakHistory(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    const resolvedDbUserId = dbUserId ?? (await this.resolveDbUserId(clerkUserId));
    if (!resolvedDbUserId) {
      return { days: [] };
    }

    return this.streaksService.getStreakHistory(resolvedDbUserId, 14);
  }

  private async resolveDbUserId(clerkUserId: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    return user?.id;
  }
}
