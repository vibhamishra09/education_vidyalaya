import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  DashboardService,
  SessionActivityDataPoint,
  WalletActivityDataPoint,
} from './dashboard.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { UsersService } from '../users/users.service';

@Controller('api/dashboard')
@UseGuards(ClerkAuthGuard)
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveDbUserId(
    dbUserId: string | undefined,
    clerkUserId: string,
  ): Promise<string> {
    if (clerkUserId) {
      const user = await this.usersService.ensureUserFromClerk(clerkUserId);
      return user.id;
    }

    if (dbUserId) {
      return dbUserId;
    }

    throw new Error('Authenticated user identity missing');
  }

  @Get()
  async getDashboardData(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Query() query: DashboardQueryDto,
  ) {
    const userId = await this.resolveDbUserId(dbUserId, clerkUserId);

    return this.dashboardService.getDashboardData(
      userId,
      clerkUserId,
      query.includeMetrics ? true : false,
      query.includeRequests ? true : false,
      query.includeSessions ? true : false,
      query.includeNotifications ? true : false,
      query.includeStreaks ? true : false,
      query.includeAchievements ? true : false,
      query.page || 1,
      query.limit || 10,
    );
  }

  @Get('session-activity')
  async getSessionActivity(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Query('days') days?: string,
  ): Promise<SessionActivityDataPoint[]> {
    const userId = await this.resolveDbUserId(dbUserId, clerkUserId);

    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getSessionActivity(userId, daysNum);
  }

  @Get('wallet-activity')
  async getWalletActivity(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Query('months') months?: string,
  ): Promise<WalletActivityDataPoint[]> {
    const userId = await this.resolveDbUserId(dbUserId, clerkUserId);

    const monthsNum = months ? parseInt(months, 10) : 6;
    return this.dashboardService.getWalletActivity(userId, monthsNum);
  }
}
