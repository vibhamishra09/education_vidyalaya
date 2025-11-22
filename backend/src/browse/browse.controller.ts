import { Controller, Get, Query } from '@nestjs/common';
import { BrowseService } from './browse.service';
import { BrowseQueryDto } from './dto/browse-query.dto';

@Controller('api/browse')
export class BrowseController {
  constructor(private browseService: BrowseService) {}

  @Get()
  async getBrowseData(@Query() query: BrowseQueryDto) {
    return this.browseService.getBrowseData(
      query.tab,
      query.search,
      query.skills,
      query.page || 1,
      query.limit || 12,
    );
  }
}
