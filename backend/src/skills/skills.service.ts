import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/skill.dto';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

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
        try {
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
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getAllSkills:`,
              error instanceof Error ? error.message : String(error),
            );
            
            // Return empty result as fallback
            return {
              skills: [],
              pagination: {
                total: 0,
                page: Math.floor(offset / limit) + 1,
                limit,
                totalPages: 0,
                hasMore: false,
              },
            };
          }
          
          // Re-throw other errors
          throw error;
        }
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
