import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService, SessionActivityDataPoint, WalletActivityDataPoint } from './dashboard.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('api/dashboard')
@UseGuards(ClerkAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getDashboardData(
    @CurrentUser() userId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getDashboardData(
      userId,
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
    @CurrentUser() userId: string,
    @Query('days') days?: string,
  ): Promise<SessionActivityDataPoint[]> {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getSessionActivity(userId, daysNum);
  }

  @Get('wallet-activity')
  async getWalletActivity(
    @CurrentUser() userId: string,
    @Query('months') months?: string,
  ): Promise<WalletActivityDataPoint[]> {
    const monthsNum = months ? parseInt(months, 10) : 6;
    return this.dashboardService.getWalletActivity(userId, monthsNum);
  }
}
