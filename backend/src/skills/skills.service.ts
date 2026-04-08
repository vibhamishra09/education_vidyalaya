import { Injectable, ConflictException, Logger, BadRequestException } from '@nestjs/common';
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
                  {
                    description: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
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

    // Validate before creating
    const { valid } = await this.validateSkill(createDto);
    if (!valid) {
      throw new BadRequestException('Not a valid skill');
    }

    const skill = await this.prisma.skill.create({
      data: createDto,
    });

    // Invalidate skills cache when a new skill is created
    await this.cacheService.deletePattern('skills:list*');

    return skill;
  }

    async validateSkill(validateDto: CreateSkillDto) {
      if(validateDto.name.length < 3) return {valid: false}
      const prompt = `You are a skill validator for an online edtech platform. Your only job is to classify whether a given skill is acceptable or not.

      ACCEPT if the skill is:
      * An academic subject (maths, science, history, physics, biology)
      * A meaningfull skill academically 
      * A technical skill (programming languages and their abbreviations, web development, AWS, machine learning)
      * A professional skill (communication, leadership, project management)
      * A creative skill (graphic design, video editing, music theory)
      * A language (English, Hindi, French, Sanskrit)
      * A vocational or digital skill teachable online
      * Vague but positive and harmless (like "communication" or "thinking")

      REJECT if the skill is:
      * Gibberish or random characters (asdfgh, xyzabc)
      * Profanity or offensive words
      * Violence or illegal activity
      * A purely physical skill not teachable online (swimming, weightlifting)
      * Meaningless or not a real concept
      * Vague words that CANT be a skill like "ok", "hello", "first", "firsttime", "skill", "newskill" 

      Reply with YES if acceptable, NO if not. Reply with ONLY the word YES or NO. No explanation. No punctuation. No extra words.

      Skill: "${validateDto.name}"`;

        try {
          const response = await fetch(
            `${process.env.OLLAMA_PROXY_URL}/api/generate`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.OLLAMA_API_KEY!,
              },
              body: JSON.stringify({
                model: "gemma3:270m", //we also have gemma3:1b, if it does'nt perform well, we can fallback to it
                prompt,
                stream: false,
                keep_alive: "10m",
                options: {
                  "num_predict": 2,
                  "temperature": 0
                }
              }),
            },
          );

          if (!response.ok) {
            this.logger.error(`Ollama proxy returned ${response.status}`);
            throw new Error('Validation service unavailable');
          }

          const data = await response.json();
          const answer = data.response?.trim().toUpperCase();

          this.logger.log(`Skill "${validateDto.name}" validation result: ${answer}`);

          return { valid: answer === 'YES' };
        } catch (error) {
          this.logger.error(
            'Skill validation failed:',
            error instanceof Error ? error.message : String(error),
          );
          throw new Error('Skill validation service is currently unavailable');
        }
      }
  }

