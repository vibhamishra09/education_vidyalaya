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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const finalLimit = limit || 50;
    const finalOffset = offset || (page ? (page - 1) * finalLimit : 0);

    return this.skillsService.getAllSkills(search, finalLimit, finalOffset);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createSkill(@Body() createDto: CreateSkillDto) {
    return this.skillsService.createSkill(createDto);
  }
}
