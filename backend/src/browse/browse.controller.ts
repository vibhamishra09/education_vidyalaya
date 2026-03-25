import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BrowseService } from './browse.service';
import { BrowseQueryDto } from './dto/browse-query.dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/browse')
export class BrowseController {
  constructor(private browseService: BrowseService) {}

  @Get()
  async getBrowseData(@Query() query: BrowseQueryDto) {
    // Ensure tab has a valid default value for mobile browsers
    const tab = query.tab || 'peers';

    return this.browseService.getBrowseData(
      tab,
      query.search,
      query.skills,
      query.page || 1,
      query.limit || 12,
      query.peerHasSocialLinks,
      query.studyStatus,
      query.studyFreeOnly,
      query.includeTrendingStudyRooms,
      query.trendingLimit,
    );
  }

  /**
   * Get personalized recommendations for the authenticated user
   * based on their "want to learn" skills.
   */
  @Get('recommendations')
  @UseGuards(ClerkAuthGuard)
  async getRecommendations(
    @CurrentUser() userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.browseService.getRecommendations(
      userId,
      limit ? parseInt(limit, 10) : 8,
    );
  }
}
