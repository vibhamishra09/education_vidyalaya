import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { Prisma, SessionStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';
import { CacheService } from '../redis/cache.service';
import { isConnectionError, withQueryTimeout } from '../common/db-error-handler';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private buildClerkDisplayName(clerkUser: any): string {
    const firstName = typeof clerkUser?.firstName === 'string' ? clerkUser.firstName.trim() : '';
    const lastName = typeof clerkUser?.lastName === 'string' ? clerkUser.lastName.trim() : '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    if (typeof clerkUser?.username === 'string' && clerkUser.username.trim()) {
      return clerkUser.username.trim();
    }
    const primaryEmail = clerkUser?.emailAddresses?.find(
      (email: any) => email.id === clerkUser?.primaryEmailAddressId,
    )?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (typeof primaryEmail === 'string' && primaryEmail.includes('@')) {
      return primaryEmail.split('@')[0];
    }
    return clerkUser?.id || 'User';
  }

  async ensureUserFromClerk(clerkId: string) {
    const existingByClerkId = await this.prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        avatar: true,
        onboarded: true,
      },
    });

    if (existingByClerkId) {
      return existingByClerkId;
    }

    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new BadRequestException('Clerk user does not have an email address');
    }

    const displayName = this.buildClerkDisplayName(clerkUser);
    const normalizedEmail = primaryEmail.trim().toLowerCase();
    const avatar = clerkUser.imageUrl || null;

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        avatar: true,
        onboarded: true,
      },
    });

    const user = existingByEmail
      ? await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId,
            name: existingByEmail.name || displayName,
            avatar: existingByEmail.avatar || avatar,
          },
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            avatar: true,
            onboarded: true,
          },
        })
      : await this.prisma.user.create({
          data: {
            clerkId,
            email: normalizedEmail,
            name: displayName,
            avatar,
            onboarded: false,
          },
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            avatar: true,
            onboarded: true,
          },
        });

    await this.syncClerkMetadata(clerkId, user.id);
    return user;
  }

  private async findUserByIdOrClerkId(
    userIdOrClerkId: string,
    args?: Omit<Prisma.UserFindUniqueArgs, 'where'>,
  ): Promise<any | null> {
    const userById = await this.prisma.user.findUnique({
      ...(args || {}),
      where: { id: userIdOrClerkId },
    });

    if (userById) {
      return userById;
    }

    return this.prisma.user.findUnique({
      ...(args || {}),
      where: { clerkId: userIdOrClerkId },
    });
  }

  private async syncClerkMetadata(clerkId: string, dbUserId: string) {
    try {
      const clerkUser = await this.clerkClient.users.getUser(clerkId);
      await this.clerkClient.users.updateUser(clerkId, {
        publicMetadata: {
          ...(clerkUser.publicMetadata || {}),
          onboardingComplete: true,
          dbUserId,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to sync Clerk metadata for ${clerkId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCurrentUser(userIdOrClerkId: string) {
    // Cache for 60 seconds - user profile changes infrequently
    const cacheKey = this.cacheService.createKey('user:current', { authUserId: userIdOrClerkId });
    const cacheTTL = 60;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const user = await withQueryTimeout(
            this.findUserByIdOrClerkId(userIdOrClerkId, {
              include: {
                userSkills: {
                  include: {
                    skill: true,
                  },
                },
              },
            }),
            25000, // 25 second timeout
            `getCurrentUser - findUnique user ${userIdOrClerkId}`,
          );

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
          ] = await withQueryTimeout(
            Promise.all([
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
            ]),
            25000, // 25 second timeout
            `getCurrentUser - Promise.all stats for user ${userIdOrClerkId}`,
          );

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
              `Database connection error in getCurrentUser for ${userIdOrClerkId}:`,
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
    const currentUser = await this.findUserByIdOrClerkId(userId, {
      select: { id: true, clerkId: true, username: true },
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
      where: { id: currentUser.id },
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
    await this.cacheService.delete(this.cacheService.createKey('user:current', { authUserId: currentUser.id }));
    await this.cacheService.delete(this.cacheService.createKey('user:current', { authUserId: currentUser.clerkId }));
    await this.cacheService.deletePattern(`user:public:${currentUser.id}*`);

    // Return updated user with skills
    return this.getCurrentUser(currentUser.id);
  }

  async getPublicUserProfile(userId: string) {
    // Cache for 2 minutes - public profiles change less frequently
    const cacheKey = this.cacheService.createKey('user:public', { userId });
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const user = await withQueryTimeout(
            this.prisma.user.findUnique({
              where: { id: userId },
              include: {
                userSkills: {
                  include: {
                    skill: true,
                  },
                },
              },
            }),
            25000, // 25 second timeout
            `getPublicUserProfile - findUnique user ${userId}`,
          );

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
          ] = await withQueryTimeout(
            Promise.all([
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
            ]),
            25000, // 25 second timeout
            `getPublicUserProfile - Promise.all stats for user ${userId}`,
          );

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
          const currentUser = await this.findUserByIdOrClerkId(currentUserId, {
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
    const user = await this.findUserByIdOrClerkId(userId, {
      select: { id: true },
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
    const normalizedEmail = data.email.trim().toLowerCase();
    const userPayload = {
      name: data.name,
      email: normalizedEmail,
      avatar: data.avatar,
      bio: data.bio,
      location: data.location,
      school: data.school,
      hourlyRate: normalizedHourlyRate,
      coins: 1000, // Award 1000 coins for completing onboarding
      onboarded: true,
    };

    const existingByClerkId = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    const existingByEmail = existingByClerkId
      ? null
      : await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

    const user = existingByClerkId
      ? await this.prisma.user.update({
          where: { clerkId },
          data: userPayload,
        })
      : existingByEmail
        ? await this.prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              ...userPayload,
              clerkId,
            },
          })
        : await this.prisma.user.create({
            data: {
              clerkId,
              ...userPayload,
            },
          });

    this.logger.debug('🔍 User created:', user);

    await this.syncClerkMetadata(clerkId, user.id);

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
