import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
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
    console.log('query', query);
    return this.dashboardService.getDashboardData(
      userId,
      query.includeMetrics ? true : false,
      query.includeRequests ? true : false,
      query.includeSessions ? true : false,
      query.includeNotifications ? true : false,
    );
  }
}
