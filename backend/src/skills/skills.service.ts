import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/skill.dto';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async getAllSkills(search?: string, limit: number = 50, offset: number = 0) {
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
  }

  async createSkill(createDto: CreateSkillDto) {
    // Check if skill already exists
    const existing = await this.prisma.skill.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Skill already exists');
    }

    return this.prisma.skill.create({
      data: createDto,
    });
  }
}
