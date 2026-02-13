import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateStudyRoomDto, UpdateStudyRoomDto } from './dto/study-room.dto';
import { SessionFeedbackDto } from '../common/dto/session-feedback.dto';
import {
  Prisma,
  SessionStatus,
  NotifType,
  PaymentStatus,
} from '@prisma/client';
import { normalizeGoogleMeetLink } from '../utils/gmeet-generator';
import { convertLocalToUTC } from '../utils/timezone';

type StudyRoomWithRelations = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  sessionStatus: SessionStatus;
  date: Date;
  duration: number;
  maxParticipants: number;
  joiningFee: number | string | Prisma.Decimal;
  gmeetLink?: string | null;
  createdBy: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  skills: Array<{
    skill: {
      id: string;
      name: string;
    };
  }>;
  learners: Array<{
    user: {
      id: string;
      name: string;
      avatar?: string | null;
    };
  }>;
};

@Injectable()
export class StudyRoomsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private streaksService: StreaksService,
    private achievementsService: AchievementsService,
    private transcriptsService: TranscriptsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(StudyRoomsService.name);
  }

  async getStudyRooms(
    search?: string,
    skills?: string[],
    status?: SessionStatus,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    limit: number = 10,
    trending?: boolean,
    createdById?: string,
  ) {
    const dbStartTime = Date.now();
    const isHomePageRequest = trending === true && limit === 6;

    if (trending) {
      this.logger.debug({
        message: isHomePageRequest
          ? '[HomePage] Fetching trending study rooms'
          : '[StudyRooms] Fetching trending study rooms',
        limit,
      });
      return this.getTrendingStudyRooms(limit);
    }

    this.logger.debug({
      message: '[StudyRooms] Building query filters',
      filters: {
        search,
        skills,
        status,
        dateFrom,
        dateTo,
        createdById,
        page,
        limit,
      },
    });

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.sessionStatus = status;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (skills && skills.length > 0) {
      where.skills = {
        some: {
          skill: {
            name: { in: skills },
          },
        },
      };
    }

    if (createdById) {
      where.createdById = createdById;
    }

    const skip = (page - 1) * limit;

    try {
      const [studyRooms, total] = await Promise.all([
        this.prisma.studyRoom.findMany({
          where,
          skip,
          take: limit,
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                avatar: true,
                reviewsReceived: {
                  select: { rating: true },
                },
                _count: {
                  select: {
                    studyRooms: {
                      where: { sessionStatus: SessionStatus.DONE },
                    },
                    peerSessionsReceived: {
                      where: { sessionStatus: SessionStatus.DONE },
                    },
                  },
                },
              },
            },
            skills: {
              include: {
                skill: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            learners: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: { date: 'asc' },
        }),
        this.prisma.studyRoom.count({ where }),
      ]);

      const dbDuration = Date.now() - dbStartTime;
      this.logger.debug({
        message: '[StudyRooms] Database query completed',
        dbDuration: `${dbDuration}ms`,
        results: {
          studyRoomsCount: studyRooms.length,
          total,
        },
      });

      const studyRoomCards = studyRooms.map((room) => {
        const hostReviews = (room.createdBy as any).reviewsReceived || [];
        const hostAvgRating =
          hostReviews.length > 0
            ? hostReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
              hostReviews.length
            : undefined;
        const hostTotalSessions =
          ((room.createdBy as any)._count?.studyRooms || 0) +
          ((room.createdBy as any)._count?.peerSessionsReceived || 0);

        return this.buildStudyRoomCard(room, {
          avgRating: hostAvgRating,
          reviewCount: hostReviews.length,
          totalSessions: hostTotalSessions,
        });
      });

      return {
        studyRooms: studyRoomCards,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      };
    } catch (error) {
      const dbDuration = Date.now() - dbStartTime;
      this.logger.error({
        message: '[StudyRooms] Database query failed',
        dbDuration: `${dbDuration}ms`,
        filters: { search, skills, status, page, limit },
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async getTrendingStudyRooms(limit?: number) {
    const dbStartTime = Date.now();
    const normalizedLimit = Math.max(1, limit ?? 6);
    const now = new Date();
    const isHomePageRequest = limit === 6;

    this.logger.debug({
      message: isHomePageRequest
        ? '[HomePage] Fetching trending study rooms from database'
        : '[StudyRooms] Fetching trending study rooms from database',
      limit: normalizedLimit,
    });

    try {
      const teacherRatings = await this.prisma.review.groupBy({
        by: ['revieweeId'],
        where: {
          reviewee: {
            studyRooms: {
              some: {
                sessionStatus: SessionStatus.UPCOMING,
                date: { gte: now },
              },
            },
          },
        },
        _avg: { rating: true },
        _count: { rating: true },
        orderBy: [{ _avg: { rating: 'desc' } }, { _count: { rating: 'desc' } }],
        take: normalizedLimit * 4,
      });

      this.logger.debug({
        message: isHomePageRequest
          ? '[HomePage] Teacher ratings query completed'
          : '[StudyRooms] Teacher ratings query completed',
        teacherRatingsCount: teacherRatings.length,
      });

      if (teacherRatings.length === 0) {
        this.logger.debug({
          message: isHomePageRequest
            ? '[HomePage] No teacher ratings found, using fallback'
            : '[StudyRooms] No teacher ratings found, using fallback',
        });
        return this.getFallbackTrendingRooms(normalizedLimit, now);
      }

      const MIN_AVG_RATING = 4;
      const prioritizedTeachers = teacherRatings.filter(
        (teacher) =>
          (teacher._avg.rating ?? 0) >= MIN_AVG_RATING &&
          (teacher._count.rating ?? 0) > 0,
      );

      const orderedTeachers =
        prioritizedTeachers.length >= normalizedLimit
          ? prioritizedTeachers
          : teacherRatings;

      this.logger.debug({
        message: isHomePageRequest
          ? '[HomePage] Fetching study rooms for prioritized teachers'
          : '[StudyRooms] Fetching study rooms for prioritized teachers',
        prioritizedCount: prioritizedTeachers.length,
        orderedCount: orderedTeachers.length,
      });

      const roomEntries = await Promise.all(
        orderedTeachers.map(async (teacher) => {
          const room = await this.prisma.studyRoom.findFirst({
            where: {
              createdById: teacher.revieweeId,
              sessionStatus: SessionStatus.UPCOMING,
              date: { gte: now },
            },
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  _count: {
                    select: {
                      studyRooms: {
                        where: { sessionStatus: SessionStatus.DONE },
                      },
                      peerSessionsReceived: {
                        where: { sessionStatus: SessionStatus.DONE },
                      },
                    },
                  },
                },
              },
              skills: {
                include: {
                  skill: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              learners: {
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
            orderBy: { date: 'asc' },
          });

          if (!room) {
            return null;
          }

          const totalSessions =
            ((room.createdBy as any)._count?.studyRooms || 0) +
            ((room.createdBy as any)._count?.peerSessionsReceived || 0);

          return {
            room,
            rating: teacher._avg.rating ?? 0,
            reviewCount: teacher._count.rating ?? 0,
            totalSessions,
          };
        }),
      );

      const uniqueRooms: Array<{
        room: StudyRoomWithRelations;
        rating: number;
        reviewCount: number;
        totalSessions: number;
      }> = [];
      const seenRoomIds = new Set<string>();

      for (const entry of roomEntries) {
        if (!entry || seenRoomIds.has(entry.room.id)) {
          continue;
        }

        seenRoomIds.add(entry.room.id);
        uniqueRooms.push(entry);

        if (uniqueRooms.length >= normalizedLimit * 2) {
          break;
        }
      }

      if (uniqueRooms.length === 0) {
        this.logger.debug({
          message: isHomePageRequest
            ? '[HomePage] No unique rooms found, using fallback'
            : '[StudyRooms] No unique rooms found, using fallback',
        });
        return this.getFallbackTrendingRooms(normalizedLimit, now);
      }

      const sortedRooms = uniqueRooms
        .sort((a, b) => {
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }

          if (b.reviewCount !== a.reviewCount) {
            return b.reviewCount - a.reviewCount;
          }

          return a.room.date.getTime() - b.room.date.getTime();
        })
        .slice(0, normalizedLimit);

      const studyRoomCards = sortedRooms.map(({ room, rating, reviewCount, totalSessions }) =>
        this.buildStudyRoomCard(room, { avgRating: rating, reviewCount, totalSessions }),
      );

      const dbDuration = Date.now() - dbStartTime;
      this.logger.debug({
        message: isHomePageRequest
          ? '[HomePage] Trending study rooms query completed'
          : '[StudyRooms] Trending study rooms query completed',
        dbDuration: `${dbDuration}ms`,
        results: {
          studyRoomsCount: studyRoomCards.length,
          uniqueRoomsFound: uniqueRooms.length,
        },
      });

      return {
        studyRooms: studyRoomCards,
        pagination: {
          total: studyRoomCards.length,
          page: 1,
          limit: normalizedLimit,
          totalPages: 1,
          hasMore: false,
        },
      };
    } catch (error) {
      const dbDuration = Date.now() - dbStartTime;
      this.logger.error({
        message: isHomePageRequest
          ? '[HomePage] Trending study rooms query failed'
          : '[StudyRooms] Trending study rooms query failed',
        dbDuration: `${dbDuration}ms`,
        limit: normalizedLimit,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async getFallbackTrendingRooms(limit: number, fromDate: Date) {
    const studyRooms = await this.prisma.studyRoom.findMany({
      where: {
        sessionStatus: SessionStatus.UPCOMING,
        date: { gte: fromDate },
      },
      take: limit,
      orderBy: { date: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            reviewsReceived: {
              select: { rating: true },
            },
            _count: {
              select: {
                studyRooms: {
                  where: { sessionStatus: SessionStatus.DONE },
                },
                peerSessionsReceived: {
                  where: { sessionStatus: SessionStatus.DONE },
                },
              },
            },
          },
        },
        skills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        learners: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const studyRoomCards = studyRooms.map((room) => {
      const hostReviews = (room.createdBy as any).reviewsReceived || [];
      const hostAvgRating =
        hostReviews.length > 0
          ? hostReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
            hostReviews.length
          : undefined;
      const hostTotalSessions =
        ((room.createdBy as any)._count?.studyRooms || 0) +
        ((room.createdBy as any)._count?.peerSessionsReceived || 0);

      return this.buildStudyRoomCard(room, {
        avgRating: hostAvgRating,
        reviewCount: hostReviews.length,
        totalSessions: hostTotalSessions,
      });
    });

    return {
      studyRooms: studyRoomCards,
      pagination: {
        total: studyRoomCards.length,
        page: 1,
        limit,
        totalPages: 1,
        hasMore: false,
      },
    };
  }

  private buildStudyRoomCard(
    room: StudyRoomWithRelations,
    rating?: { avgRating?: number; reviewCount?: number; totalSessions?: number },
  ) {
    return {
      id: room.id,
      title: room.title,
      description: room.description,
      imageUrl: room.imageUrl,
      sessionStatus: room.sessionStatus,
      date: room.date,
      duration: room.duration,
      maxParticipants: room.maxParticipants,
      joiningFee: room.joiningFee,
      gmeetLink: (room as any).gmeetLink,
      participantCount: room.learners.length,
      createdBy: {
        id: room.createdBy.id,
        name: room.createdBy.name,
        avatar: room.createdBy.avatar,
      },
      skills: room.skills.map((s) => s.skill.name),
      hostAvgRating: rating?.avgRating,
      hostReviewCount: rating?.reviewCount,
      hostTotalSessions: rating?.totalSessions,
    };
  }

  async getStudyRoomDetails(studyRoomId: string, userId?: string) {
    const [studyRoom, currentUser, channel] = await Promise.all([
      this.prisma.studyRoom.findUnique({
        where: { id: studyRoomId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          skills: {
            include: {
              skill: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          learners: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          reviews: {
            orderBy: { id: 'desc' },
            take: 20,
            include: {
              reviewer: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      userId
        ? this.prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true },
          })
        : Promise.resolve(null),
      this.prisma.channel.findFirst({
        where: { externalType: 'studyRoom', externalId: studyRoomId },
        select: { id: true },
      }),
    ]);

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    let role: 'teacher' | 'learner' | 'empty' = 'empty';
    if (currentUser) {
      if (studyRoom.createdById === currentUser.id) {
          role = 'teacher';
        } else if (studyRoom.learners.some((l) => l.userId === currentUser.id)) {
          role = 'learner';
      }
    }

    return {
      id: studyRoom.id,
      title: studyRoom.title,
      description: studyRoom.description,
      imageUrl: studyRoom.imageUrl,
      sessionStatus: studyRoom.sessionStatus,
      date: studyRoom.date,
      duration: studyRoom.duration,
      maxParticipants: studyRoom.maxParticipants,
      joiningFee: studyRoom.joiningFee,
      gmeetLink: (studyRoom as any).gmeetLink,
      summary: studyRoom.summary,
      createdBy: studyRoom.createdBy,
      skills: studyRoom.skills.map((s) => s.skill),
      participants: studyRoom.learners.map((l) => l.user),
      participantCount: studyRoom.learners.length,
      role,
      reviews: studyRoom.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        reviewer: r.reviewer,
      })),
      chatChannelId: channel?.id ?? null,
    };
  }

  async createStudyRoom(userId: string, createDto: CreateStudyRoomDto) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Convert user's local time to UTC
    // Example: 11 AM IST -> 5:30 AM UTC
    const dateTime = convertLocalToUTC(
      createDto.date,
      createDto.time,
      createDto.timezone,
    );

    // Validate that session is not scheduled too far in the past
    // Allow a small buffer (2 minutes) for instant rooms to account for form fill time
    const now = new Date();
    const twoMinutesAgo = now.getTime() - 2 * 60 * 1000;

    if (dateTime.getTime() < twoMinutesAgo) {
      throw new BadRequestException({
        code: 'PAST_TIME_NOT_ALLOWED',
        message: 'Study rooms cannot be scheduled in the past',
      });
    }

    // Determine session status based on start time
    // If the room starts now or in the past (instant room), set it to ONGOING immediately
    const sessionStatus =
      dateTime.getTime() <= now.getTime()
        ? SessionStatus.ONGOING
        : SessionStatus.UPCOMING;

    // Normalize Google Meet link if provided
    const gmeetLink = createDto.gmeetLink
      ? normalizeGoogleMeetLink(createDto.gmeetLink)
      : null;

    // Create study room
    const studyRoom = await this.prisma.studyRoom.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        imageUrl: createDto.imageUrl,
        date: dateTime,
        duration: createDto.duration,
        maxParticipants: createDto.maxParticipants,
        joiningFee: createDto.joiningFee || 0,
        sessionStatus: sessionStatus,
        createdById: user.id, // Use the database ID, not clerkId
        gmeetLink: gmeetLink,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Add skills
    for (const skillName of createDto.skills) {
      const skill = await this.prisma.skill.findUnique({
        where: { name: skillName },
      });

      if (skill) {
        await this.prisma.studyRoomSkill.create({
          data: {
            studyRoomId: studyRoom.id,
            skillId: skill.id,
          },
        });
      }
    }

    // Create chat channel for the study room (creator is automatically added)
    await this.chatService.getOrCreateChannelForStudyRoom(studyRoom.id, [
      user.id,
    ]);

    return this.getStudyRoomDetails(studyRoom.id, userId);
  }

  async updateStudyRoom(
    studyRoomId: string,
    userId: string,
    updateDto: UpdateStudyRoomDto,
  ) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
    });

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    if (studyRoom.createdById !== user.id) {
      throw new ForbiddenException(
        'Only the creator can update this study room',
      );
    }

    const updateData: any = {};

    if (updateDto.title) updateData.title = updateDto.title;
    if (updateDto.description !== undefined)
      updateData.description = updateDto.description;
    if (updateDto.imageUrl !== undefined)
      updateData.imageUrl = updateDto.imageUrl;
    if (updateDto.duration) updateData.duration = updateDto.duration;
    if (updateDto.maxParticipants)
      updateData.maxParticipants = updateDto.maxParticipants;
    if (updateDto.joiningFee !== undefined)
      updateData.joiningFee = updateDto.joiningFee;

    if (updateDto.date && updateDto.time) {
      updateData.date = new Date(`${updateDto.date}T${updateDto.time}`);
    } else if (updateDto.date) {
      const oldTime = studyRoom.date.toISOString().split('T')[1];
      updateData.date = new Date(`${updateDto.date}T${oldTime}`);
    } else if (updateDto.time) {
      const oldDate = studyRoom.date.toISOString().split('T')[0];
      updateData.date = new Date(`${oldDate}T${updateDto.time}`);
    }

    // Update study room
    await this.prisma.studyRoom.update({
      where: { id: studyRoomId },
      data: updateData,
    });

    // Update skills if provided
    if (updateDto.skills) {
      await this.prisma.studyRoomSkill.deleteMany({
        where: { studyRoomId },
      });

      for (const skillName of updateDto.skills) {
        const skill = await this.prisma.skill.findUnique({
          where: { name: skillName },
        });

        if (skill) {
          await this.prisma.studyRoomSkill.create({
            data: {
              studyRoomId,
              skillId: skill.id,
            },
          });
        }
      }
    }

    return this.getStudyRoomDetails(studyRoomId, userId);
  }

  async joinStudyRoom(studyRoomId: string, userId: string) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, coins: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
      include: {
        learners: true,
        createdBy: true,
      },
    });

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    // Teacher (creator) cannot join their own study room as a learner
    if (studyRoom.createdById === user.id) {
      return {
        success: true,
        message: 'You are the teacher of this study room',
      };
    }

    if (studyRoom.learners.length >= studyRoom.maxParticipants) {
      throw new BadRequestException({
        code: 'ROOM_FULL',
        message: 'Study room is at capacity',
      });
    }

    // Check if already joined
    const alreadyJoined = studyRoom.learners.some((l) => l.userId === user.id);
    if (alreadyJoined) {
      return {
        success: true,
        message: 'Already joined',
      };
    }

    if (
      parseFloat(user.coins.toString()) <
      parseFloat(studyRoom.joiningFee.toString())
    ) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_COINS',
        message: `You need ${parseFloat(studyRoom.joiningFee.toString()).toFixed(2)} Coins to join this study room. You have ${parseFloat(user.coins.toString()).toFixed(2)} Coins.`,
      });
    }

    // Process payment and join in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Deduct coins from user (held in escrow)
      await tx.user.update({
        where: { id: user.id },
        data: {
          coins: {
            decrement: studyRoom.joiningFee,
          },
        },
      });

      // Create payment record in escrow (coins will be released to creator after learner reviews)
      await tx.payment.create({
        data: {
          paymentStatus: PaymentStatus.ESCROW,
          madeById: user.id, // Use the database ID, not clerkId
          receivedById: studyRoom.createdById,
          studyRoomId: studyRoomId,
          amountMade: studyRoom.joiningFee,
          amountReceived: studyRoom.joiningFee,
        },
      });

      // Add participant
      await tx.studyRoomParticipant.create({
        data: {
          userId: user.id, // Use the database ID, not clerkId
          studyRoomId,
        },
      });
    });

    // Get all participants (creator + learners) for the chat channel
    const allParticipants = await this.prisma.studyRoomParticipant.findMany({
      where: { studyRoomId },
      select: { userId: true },
    });
    const participantIds = [
      studyRoom.createdById,
      ...allParticipants.map((p) => p.userId),
    ];

    // Ensure chat channel exists and add the new member
    await this.chatService.getOrCreateChannelForStudyRoom(
      studyRoomId,
      participantIds,
    );

    // Get user name for notification
    const userWithName = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    });

    this.logger.debug({
      message: '🔔 [joinStudyRoom] Sending notification to room creator',
      creatorId: studyRoom.createdById,
      joinerName: userWithName?.name,
      roomTitle: studyRoom.title,
    });

    // Notify the study room creator
    await this.notificationsService.createAndPushNotification(
      studyRoom.createdById,
      `${userWithName?.name} has joined your study room "${studyRoom.title}"`,
      'New Participant',
      NotifType.NORMAL,
      {
        actionType: 'STUDYROOM_JOINED',
        studyRoomId: studyRoomId,
        actionData: { sessionId: studyRoomId, sessionType: 'studyRoom' },
      },
    );

    this.logger.log('✅ [joinStudyRoom] Notification sent successfully');

    return {
      success: true,
      message: 'Successfully joined study room',
    };
  }

  async completeStudyRoom(studyRoomId: string, userId: string) {
    this.logger.debug({
      message: '🎯 [completeStudyRoom] Called with',
      studyRoomId,
      clerkUserId: userId,
    });

    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, name: true },
    });

    if (!user) {
    this.logger.error({
      message: '❌ [completeStudyRoom] User not found for clerkId',
      clerkUserId: userId,
    });
      throw new NotFoundException('User not found');
    }

    this.logger.debug({
      message: '✅ [completeStudyRoom] User found',
      id: user.id,
      name: user.name,
    });

    const studyRoom = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
    });

    if (!studyRoom) {
      this.logger.error({
        message: '❌ [completeStudyRoom] Study room not found',
        studyRoomId,
      });
      throw new NotFoundException('Study room not found');
    }

    this.logger.debug({
      message: '✅ [completeStudyRoom] Study room found',
      id: studyRoom.id,
      title: studyRoom.title,
      date: studyRoom.date,
      duration: studyRoom.duration,
      createdById: studyRoom.createdById,
    });

    // Check if user is part of the study room (creator or participant)
    const isCreator = studyRoom.createdById === user.id;
    const isParticipant = await this.prisma.studyRoomParticipant.findFirst({
      where: {
        studyRoomId,
        userId: user.id,
      },
    });

    this.logger.debug({
      message: '🔐 [completeStudyRoom] Authorization check',
      isCreator,
      hasParticipant: !!isParticipant,
    });

    if (!isCreator && !isParticipant) {
      this.logger.error(
        '❌ [completeStudyRoom] Not authorized to complete this study room',
      );
      throw new ForbiddenException(
        'Not authorized to complete this study room',
      );
    }

    // Update study room status to COMPLETED
    this.logger.debug('📝 [completeStudyRoom] Updating study room status to DONE...');
    const updatedRoom = await this.prisma.studyRoom.update({
      where: { id: studyRoomId },
      data: { sessionStatus: SessionStatus.DONE },
    });
    this.logger.log('✅ [completeStudyRoom] Study room status updated to DONE');

    // Get all participants for streak tracking
    const participants = await this.prisma.studyRoomParticipant.findMany({
      where: { studyRoomId },
      select: { userId: true },
    });

    this.logger.debug(
      `👥 [completeStudyRoom] Found ${participants.length} participants`,
    );

    // Update streak for the creator (host/teacher)
    this.logger.debug(
      '🔥 [completeStudyRoom] Updating streak for creator (teacher)',
      studyRoom.createdById,
    );
    await this.streaksService.updateUserActivity(
      studyRoom.createdById,
      studyRoom.date,
      studyRoom.duration,
      'teacher',
      0,
    );

    // Check achievements for creator
    await this.achievementsService.checkSessionAchievements(
      studyRoom.createdById,
      'teacher',
    );

    // Check streak achievements for creator
    const creatorStreak = await this.streaksService.getUserStreak(
      studyRoom.createdById,
    );
    await this.achievementsService.checkStreakAchievements(
      studyRoom.createdById,
      creatorStreak.currentStreak,
    );

    // Update streak for all participants (learners)
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];

      await this.streaksService.updateUserActivity(
        participant.userId,
        studyRoom.date,
        studyRoom.duration,
        'learner',
        0,
      );

      // Check achievements for participant
      await this.achievementsService.checkSessionAchievements(
        participant.userId,
        'learner',
      );

      // Check streak achievements for participant
      const participantStreak = await this.streaksService.getUserStreak(
        participant.userId,
      );
      await this.achievementsService.checkStreakAchievements(
        participant.userId,
        participantStreak.currentStreak,
      );
    }

    // Generate AI summary from transcripts
    let summary: string | null = null;
    try {
      this.logger.debug(
        '🤖 [completeStudyRoom] Generating AI summary for study room',
        studyRoomId,
      );
      summary = await this.transcriptsService.compileAndSummarize(studyRoomId);

      // Store summary in database
      await this.prisma.studyRoom.update({
        where: { id: studyRoomId },
        data: { summary },
      });
      this.logger.log(
        '✅ [completeStudyRoom] AI summary generated and stored successfully',
      );
    } catch (error) {
      this.logger.error(
        '⚠️ [completeStudyRoom] Failed to generate summary',
        error instanceof Error ? error.stack : undefined,
        `studyRoomId: ${studyRoomId}, error: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue execution even if summary generation fails
    }

    return {
      success: true,
      message: 'Study room marked as completed',
      studyRoom: updatedRoom,
      summary,
    };
  }

  async checkIsHost(studyRoomId: string, userId: string) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
      select: { createdById: true },
    });

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    const isHost = studyRoom.createdById === user.id;

    return { isHost };
  }

  async markNotCompleted(studyRoomId: string, userId: string) {
    this.logger.debug({
      message: '⏰ [markNotCompleted] Called with',
      studyRoomId,
      clerkUserId: userId,
    });

    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      this.logger.error({
        message: '❌ [markNotCompleted] User not found for clerkId',
        clerkUserId: userId,
      });
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
      select: {
        id: true,
        title: true,
        createdById: true,
        sessionStatus: true,
      },
    });

    if (!studyRoom) {
      this.logger.error({
        message: '❌ [markNotCompleted] Study room not found',
        studyRoomId,
      });
      throw new NotFoundException('Study room not found');
    }

    // Check if user is the host (only host can mark as not completed)
    if (studyRoom.createdById !== user.id) {
      this.logger.error('❌ [markNotCompleted] Not authorized - not the host');
      throw new ForbiddenException(
        'Only the host can mark the session as not completed',
      );
    }

    // Update study room status to NOT_COMPLETED
    this.logger.debug('📝 [markNotCompleted] Updating study room status to NOT_COMPLETED...');
    const updatedRoom = await this.prisma.studyRoom.update({
      where: { id: studyRoomId },
      data: { sessionStatus: SessionStatus.NOT_COMPLETED },
    });
    this.logger.log('✅ [markNotCompleted] Study room status updated to NOT_COMPLETED');

    // No streak updates, no achievements, no summary for NOT_COMPLETED sessions
    return {
      success: true,
      message: 'Study room marked as not completed (time expired)',
      studyRoom: updatedRoom,
    };
  }

  async saveSessionFeedback(
    studyRoomId: string,
    userId: string,
    feedbackDto: SessionFeedbackDto,
  ) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
      select: { 
        id: true, 
        createdById: true,
        learners: {
          select: { userId: true },
        },
      },
    });

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    // Check if user is either the host or a participant
    const isHost = studyRoom.createdById === user.id;
    const isParticipant = studyRoom.learners.some((l) => l.userId === user.id);

    if (!isHost && !isParticipant) {
      throw new ForbiddenException(
        'You are not authorized to submit feedback for this study room',
      );
    }

    // Check if user has already submitted feedback for this session
    const existingFeedback = await this.prisma.sessionFeedback.findFirst({
      where: {
        userId: user.id,
        studyRoomId: studyRoomId,
      },
    });

    // Store all answers as JSON (cast to Prisma's InputJsonValue type)
    const answersJson = (feedbackDto.answers || {}) as unknown as Prisma.InputJsonValue;

    if (existingFeedback) {
      // Update existing feedback
      await this.prisma.sessionFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          isHost: feedbackDto.isHost,
          answers: answersJson,
        },
      });

      this.logger.log('✅ [saveSessionFeedback] Feedback updated for study room',
        studyRoomId,
      );
    } else {
      // Create new feedback entry
      await this.prisma.sessionFeedback.create({
        data: {
          userId: user.id,
          studyRoomId: studyRoomId,
          isHost: feedbackDto.isHost,
          answers: answersJson,
        },
      });

      this.logger.log('✅ [saveSessionFeedback] Feedback created for study room',
        studyRoomId,
      );
    }

    return {
      success: true,
      message: 'Feedback submitted successfully',
      studyRoomId,
    };
  }
}
