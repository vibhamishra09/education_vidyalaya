import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getCurrentUser(clerkUserId: string) {
    // Cache for 60 seconds - user profile changes infrequently
    const cacheKey = this.cacheService.createKey('user:current', { clerkUserId });
    const cacheTTL = 60;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const user = await this.prisma.user.findUnique({
            where: { clerkId: clerkUserId },
            include: {
              userSkills: {
                include: {
                  skill: true,
                },
              },
            },
          });

        const isNewUser = !user;

        if (!user) {
          throw new NotFoundException(
            'User not found. Please complete onboarding first.',
          );
        }

        const hasSkills = user.userSkills
          .filter((us) => us.type === 'HAS')
          .map((us) => us.skill.name);

        const wantSkills = user.userSkills
          .filter((us) => us.type === 'WANTS')
          .map((us) => us.skill.name);

        // Fetch public stats for the current user
        const acceptedStatuses = [
          SessionStatus.UPCOMING,
          SessionStatus.ONGOING,
          SessionStatus.DONE,
        ];

        const [
          peerSessionsTaught,
          studyRoomsHosted,
          totalSessionRequests,
          acceptedSessions,
          reviewStats,
          peerSessionsAsLearner,
          studyRoomsAsLearner,
        ] = await Promise.all([
          // Count peer sessions where user is the teacher (received)
          this.prisma.peerSession.count({
            where: {
              requestedToId: user.id,
              sessionStatus: SessionStatus.DONE,
            },
          }),
          // Count study rooms where user is the creator/host
          this.prisma.studyRoom.count({
            where: {
              createdById: user.id,
              sessionStatus: SessionStatus.DONE,
            },
          }),
          this.prisma.peerSession.count({
            where: { requestedToId: user.id },
          }),
          this.prisma.peerSession.count({
            where: {
              requestedToId: user.id,
              sessionStatus: {
                in: acceptedStatuses,
              },
            },
          }),
          this.prisma.review.aggregate({
            where: { revieweeId: user.id },
            _avg: { rating: true },
            _count: { rating: true },
          }),
          // Count peer sessions where user is the learner (requester)
          this.prisma.peerSession.count({
            where: {
              requestedById: user.id,
              sessionStatus: SessionStatus.DONE,
            },
          }),
          // Count study rooms where user is a participant (not creator)
          this.prisma.studyRoomParticipant.count({
            where: {
              userId: user.id,
              studyRoom: {
                sessionStatus: SessionStatus.DONE,
                createdById: { not: user.id }, // Exclude rooms user created (taught)
              },
            },
          }),
        ]);

        // Total sessions taught includes both peer sessions and study rooms hosted
        const sessionsTaught = peerSessionsTaught + studyRoomsHosted;
        const sessionsAttendedAsLearner = peerSessionsAsLearner + studyRoomsAsLearner;

        const acceptanceRate =
          totalSessionRequests > 0 ? acceptedSessions / totalSessionRequests : 0;

        return {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            location: user.location,
            school: user.school,
            coins: user.coins,
            hourlyRate: user.hourlyRate,
            hasSkills,
            wantSkills,
            socialLinks: user.socialLinks as any[] || [],
            publicStats: {
              sessionsTaught,
              sessionsAttendedAsLearner,
              totalSessionRequests,
              acceptedSessions,
              acceptanceRate,
              avgRating: reviewStats._avg.rating ?? 0,
              reviewCount: reviewStats._count.rating ?? 0,
            },
          },
          isNewUser,
        };
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getCurrentUser for ${clerkUserId}:`,
              error instanceof Error ? error.message : String(error),
            );
            
            // Re-throw NotFoundException (user not found is a valid case)
            if (error instanceof NotFoundException) {
              throw error;
            }
            
            // For connection errors, throw a more user-friendly error
            throw new NotFoundException(
              'Unable to fetch user data. Please try again later.',
            );
          }
          
          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }

  async updateUserProfile(userId: string, updateDto: UpdateUserDto) {
    const {
      name,
      bio,
      avatar,
      location,
      school,
      username,
      hourlyRate,
      hasSkills,
      wantSkills,
      socialLinks,
    } = updateDto;

    // Get current user to check existing username
    const currentUser = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, username: true },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Check username uniqueness if username is being updated
    if (username !== undefined && username !== currentUser.username) {
      // Check if username is already taken by another user
      // Use findFirst because username is nullable and findUnique doesn't work well with nullable unique fields
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: username,
          id: { not: currentUser.id }, // Exclude current user
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException('Username is already taken');
      }
    }

    // Update user name, bio, avatar, location, school, username, hourly rate, and social links
    const user = await this.prisma.user.update({
      where: { clerkId: userId },
      data: {
        name: name !== undefined ? name : undefined,
        bio,
        avatar,
        location,
        school,
        username: username !== undefined ? username : undefined,
        hourlyRate: hourlyRate !== undefined ? hourlyRate : undefined,
        socialLinks: socialLinks !== undefined 
          ? (socialLinks as unknown as Prisma.InputJsonValue) 
          : undefined,
      },
    });

    // Update skills if provided
    if (hasSkills !== undefined) {
      // Remove existing HAS skills
      await this.prisma.userSkill.deleteMany({
        where: { userId: user.id, type: 'HAS' },
      });

      // Add new HAS skills
      for (const skillName of hasSkills) {
        const skill = await this.prisma.skill.findUnique({
          where: { name: skillName },
        });

        if (skill) {
          await this.prisma.userSkill.create({
            data: {
              userId: user.id,
              skillId: skill.id,
              type: 'HAS',
            },
          });
        }
      }
    }

    if (wantSkills !== undefined) {
      // Remove existing WANTS skills
      await this.prisma.userSkill.deleteMany({
        where: { userId: user.id, type: 'WANTS' },
      });

      // Add new WANTS skills
      for (const skillName of wantSkills) {
        const skill = await this.prisma.skill.findUnique({
          where: { name: skillName },
        });

        if (skill) {
          await this.prisma.userSkill.create({
            data: {
              userId: user.id,
              skillId: skill.id,
              type: 'WANTS',
            },
          });
        }
      }
    }

    // Invalidate cache for this user
    await this.cacheService.delete(this.cacheService.createKey('user:current', { clerkUserId: userId }));
    await this.cacheService.deletePattern(`user:public:${userId}*`);

    // Return updated user with skills
    return this.getCurrentUser(userId);
  }

  async getPublicUserProfile(userId: string) {
    // Cache for 2 minutes - public profiles change less frequently
    const cacheKey = this.cacheService.createKey('user:public', { userId });
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
              userSkills: {
                include: {
                  skill: true,
                },
              },
            },
          });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        const hasSkills = user.userSkills
          .filter((us) => us.type === 'HAS')
          .map((us) => us.skill.name);

        const wantSkills = user.userSkills
          .filter((us) => us.type === 'WANTS')
          .map((us) => us.skill.name);

        const acceptedStatuses = [
          SessionStatus.UPCOMING,
          SessionStatus.ONGOING,
          SessionStatus.DONE,
        ];

        const [
          sessionsTaught,
          totalSessionRequests,
          acceptedSessions,
          reviewStats,
          peerSessionsAsLearner,
          studyRoomsAsLearner,
        ] = await Promise.all([
          this.prisma.peerSession.count({
            where: {
              requestedToId: user.id,
              sessionStatus: SessionStatus.DONE,
            },
          }),
          this.prisma.peerSession.count({
            where: { requestedToId: user.id },
          }),
          this.prisma.peerSession.count({
            where: {
              requestedToId: user.id,
              sessionStatus: {
                in: acceptedStatuses,
              },
            },
          }),
          this.prisma.review.aggregate({
            where: { revieweeId: user.id },
            _avg: { rating: true },
            _count: { rating: true },
          }),
          // Count peer sessions where user is the learner (requester)
          this.prisma.peerSession.count({
            where: {
              requestedById: user.id,
              sessionStatus: SessionStatus.DONE,
            },
          }),
          // Count study rooms where user is a participant (not creator)
          this.prisma.studyRoomParticipant.count({
            where: {
              userId: user.id,
              studyRoom: {
                sessionStatus: SessionStatus.DONE,
                createdById: { not: user.id }, // Exclude rooms user created (taught)
              },
            },
          }),
        ]);

        const sessionsAttendedAsLearner = peerSessionsAsLearner + studyRoomsAsLearner;

        const acceptanceRate =
          totalSessionRequests > 0 ? acceptedSessions / totalSessionRequests : 0;

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          location: user.location,
          school: user.school,
          coins: user.coins,
          hourlyRate: user.hourlyRate,
          hasSkills,
          wantSkills,
          socialLinks: user.socialLinks as any[] || [],
          publicStats: {
            sessionsTaught,
            sessionsAttendedAsLearner,
            totalSessionRequests,
            acceptedSessions,
            acceptanceRate,
            avgRating: reviewStats._avg.rating ?? 0,
            reviewCount: reviewStats._count.rating ?? 0,
          },
        };
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getPublicUserProfile for user ${userId}:`,
              error instanceof Error ? error.message : String(error),
            );
            
            // Re-throw NotFoundException (user not found is a valid case)
            if (error instanceof NotFoundException) {
              throw error;
            }
            
            // For connection errors, throw a more user-friendly error
            throw new NotFoundException(
              'Unable to fetch user profile. Please try again later.',
            );
          }
          
          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }

  async checkUsernameAvailability(
    username: string,
    currentUserId?: string,
  ): Promise<{ available: boolean }> {
    try {
      // Check if username is already taken
      // Use findFirst instead of findUnique because username is nullable and findUnique doesn't work well with nullable unique fields
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: username, // This will match the exact username (case-sensitive in DB, but we handle case in frontend)
        },
        select: { id: true },
      });

      // If no user found with this username, it's available
      if (!existingUser) {
        return { available: true };
      }

      // If checking for current user, allow if it's their own username
      if (currentUserId) {
        try {
          const currentUser = await this.prisma.user.findUnique({
            where: { clerkId: currentUserId },
            select: { id: true, username: true },
          });

          // If it's the current user's own username, it's available
          if (currentUser && existingUser.id === currentUser.id) {
            return { available: true };
          }
        } catch (error) {
          // If we can't find current user, just treat username as taken
          this.logger.debug('Error finding current user:', error);
        }
      }

      // Username is taken by someone else
      return { available: false };
    } catch (error) {
      this.logger.debug('Error checking username availability:', error);
      // On error, return false to be safe (don't allow potentially duplicate usernames)
      return { available: false };
    }
  }

  async getUserSkills(userId: string, type?: 'HAS' | 'WANTS') {
    // First get the user to get the internal ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = { userId: user.id };
    if (type) {
      where.type = type;
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where,
      include: {
        skill: true,
      },
    });

    return userSkills.map((us) => ({
      id: us.id,
      type: us.type,
      skill: {
        id: us.skill.id,
        name: us.skill.name,
        description: us.skill.description,
      },
    }));
  }

  async completeOnboarding(
    clerkId: string,
    data: {
      name: string;
      email: string;
      avatar?: string;
      bio?: string;
      location?: string;
      school?: string;
      hourlyRate?: number;
      skillsIHave: string[];
      skillsIWant: string[];
    },
  ) {
    // Create user with onboarding data (on-demand user creation)
    this.logger.debug('🔍 Completing onboarding for user:', clerkId);
    const normalizedHourlyRate = data.hourlyRate ?? 0;
    const user = await this.prisma.user.upsert({
      where: { clerkId },
      update: {
        name: data.name,
        email: data.email,
        avatar: data.avatar,
        bio: data.bio,
        location: data.location,
        school: data.school,
        hourlyRate: normalizedHourlyRate,
        coins: 1000, // Award 1000 coins for completing onboarding
        onboarded: true,
      },
      create: {
        clerkId,
        name: data.name,
        email: data.email,
        avatar: data.avatar,
        bio: data.bio,
        location: data.location,
        school: data.school,
        hourlyRate: normalizedHourlyRate,
        coins: 1000, // Award 1000 coins for completing onboarding
        onboarded: true,
      },
    });

    this.logger.debug('🔍 User created:', user);

    // Process skills - first ensure they exist in the Skill table
    const allSkills = [...data.skillsIHave, ...data.skillsIWant];
    for (const skillName of allSkills) {
      await this.prisma.skill.upsert({
        where: { name: skillName },
        update: {},
        create: { name: skillName },
      });
    }

    // Clear existing user skills
    await this.prisma.userSkill.deleteMany({
      where: { userId: user.id },
    });

    // Add "HAS" skills
    for (const skillName of data.skillsIHave) {
      const skill = await this.prisma.skill.findUnique({
        where: { name: skillName },
      });

      if (skill) {
        await this.prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skill.id,
            type: 'HAS',
          },
        });
      }
    }

    // Add "WANTS" skills
    for (const skillName of data.skillsIWant) {
      const skill = await this.prisma.skill.findUnique({
        where: { name: skillName },
      });

      if (skill) {
        await this.prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skill.id,
            type: 'WANTS',
          },
        });
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        hourlyRate: user.hourlyRate,
        coins: user.coins,
        onboarded: user.onboarded,
      },
    };
  }
}
