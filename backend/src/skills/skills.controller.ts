import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CreateSkillDto } from './dto/skill.dto';

@Controller('api/skills')
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get()
  async getAllSkills(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Query params are strings from HTTP/Swagger — coerce so Prisma skip/take stay numeric.
    const parsedLimit = Math.min(Math.max(parseInt(limit ?? '', 10) || 50, 1), 500);
    const parsedPage = parseInt(page ?? '', 10);
    const parsedOffset = parseInt(offset ?? '', 10);
    const finalLimit = parsedLimit;
    const finalOffset =
      Number.isFinite(parsedOffset) && parsedOffset >= 0
        ? parsedOffset
        : Number.isFinite(parsedPage) && parsedPage >= 1
          ? (parsedPage - 1) * finalLimit
          : 0;

    return this.skillsService.getAllSkills(search, finalLimit, finalOffset);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createSkill(@Body() createDto: CreateSkillDto) {
    return this.skillsService.createSkill(createDto);
  }
}
