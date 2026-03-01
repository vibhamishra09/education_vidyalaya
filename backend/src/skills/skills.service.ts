import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/skill.dto';
import { CacheService } from '../redis/cache.service';

@Injectable()
export class SkillsService {
  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getAllSkills(search?: string, limit: number = 50, offset: number = 0) {
    // Cache for 5 minutes - skills list changes infrequently
    const cacheKey = this.cacheService.createKey('skills:list', {
      search,
      limit,
      offset,
    });
    const cacheTTL = 300;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const where = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {};

        const [skills, total] = await Promise.all([
          this.prisma.skill.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { name: 'asc' },
          }),
          this.prisma.skill.count({ where }),
        ]);

        return {
          skills,
          pagination: {
            total,
            page: Math.floor(offset / limit) + 1,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
          },
        };
      },
      cacheTTL,
    );
  }

  async createSkill(createDto: CreateSkillDto) {
    // Check if skill already exists
    const existing = await this.prisma.skill.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Skill already exists');
    }

    const skill = await this.prisma.skill.create({
      data: createDto,
    });

    // Invalidate skills cache when a new skill is created
    await this.cacheService.deletePattern('skills:list*');

    return skill;
  }
}
