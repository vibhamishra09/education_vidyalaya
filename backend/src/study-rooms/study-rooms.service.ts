/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { EmailService } from '../email/email.service';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { LoggerService } from '../common/logger/logger.service';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';
import {
  CreateStudyRoomDto,
  StudyRoomEditScope,
  UpdateStudyRoomDto,
} from './dto/study-room.dto';
import { SessionFeedbackDto } from '../common/dto/session-feedback.dto';
import {
  Prisma,
  SessionStatus,
  NotifType,
  PaymentStatus,
  StudyRoomParticipantRole,
  ExternalInviteRole,
  ExternalJoinRequestStatus,
} from '../generated/prisma/client';
import { convertLocalToUTC } from '../utils/timezone';
import { buildStudyRoomOccurrences } from './recurrence.util';
import {
  ExternalInviteInputDto,
  ExternalJoinRequestDto,
  StudyRoomParticipantRoleDto,
} from './dto/study-room.dto';

type StudyRoomWithRelations = {
  id: string;
  title: string;
  slug?:string | null
  description?: string | null;
  imageUrl?: string | null;
  sessionStatus: SessionStatus;
  date: Date;
  duration: number;
  maxParticipants: number;
  joiningFee: number | string | Prisma.Decimal;
  seriesId?: string | null;
  seriesRootId?: string | null;
  occurrenceIndex?: number | null;
  isRecurring?: boolean;
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

type InviteEmailDeliverySummary = {
  attempted: number;
  sent: number;
  failed: number;
  failures: Array<{
    email: string;
    role: StudyRoomParticipantRoleDto;
    errorCode?: string;
    errorMessage?: string;
  }>;
};

@Injectable()
export class StudyRoomsService {
  private studyRoomSchemaCapabilities:
    | {
      slug: boolean;
      hostDetailsUpdatedAt: boolean;
    }
    | null = null;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private emailService: EmailService,
    private streaksService: StreaksService,
    private achievementsService: AchievementsService,
    private transcriptsService: TranscriptsService,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(StudyRoomsService.name);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generatePasscode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private toParticipantRole(
    role?:
      | StudyRoomParticipantRoleDto
      | ExternalInviteRole
      | StudyRoomParticipantRole,
  ): StudyRoomParticipantRole {
    if (String(role) === 'COHOST') {
      return StudyRoomParticipantRole.COHOST;
    }
    return StudyRoomParticipantRole.PARTICIPANT;
  }

  private async issueGuestAccessToken(
    studyRoomId: string,
    guestParticipantId: string,
  ) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.studyRoomGuestAccessToken.create({
      data: {
        token,
        studyRoomId,
        guestParticipantId,
        expiresAt,
      },
    });
    return token;
  }

  private async resolveUserIdentity(userIdOrClerkId: string) {
    const byId = await this.prisma.user.findUnique({
      where: { id: userIdOrClerkId },
      select: { id: true, clerkId: true },
    });

    if (byId) {
      return byId;
    }

    const byClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userIdOrClerkId },
      select: { id: true, clerkId: true },
    });

    if (byClerkId) {
      return byClerkId;
    }

    throw new NotFoundException('User not found');
  }

  private async resolveStudyRoomByIdOrSlug(
    studyRoomIdOrSlug: string,
    options?: { select?: any; include?: any },
  ): Promise<any> {
    const caps = await this.getStudyRoomSchemaCapabilities();

    if (caps.slug) {
      return this.prisma.studyRoom.findFirst({
        where: {
          OR: [{ id: studyRoomIdOrSlug }, { slug: studyRoomIdOrSlug }],
        },
        ...(options?.select ? { select: options.select } : {}),
        ...(options?.include ? { include: options.include } : {}),
      });
    }

    return this.prisma.studyRoom.findUnique({
      where: { id: studyRoomIdOrSlug },
      ...(options?.select ? { select: options.select } : {}),
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  private async getStudyRoomSchemaCapabilities() {
    if (this.studyRoomSchemaCapabilities) {
      return this.studyRoomSchemaCapabilities;
    }

    const [slugRows, hostRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE LOWER(table_name) = 'studyroom'
            AND LOWER(column_name) = 'slug'
        ) AS "exists"
      `),
      this.prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE LOWER(table_name) = 'studyroom'
            AND LOWER(column_name) = 'hostdetailsupdatedat'
        ) AS "exists"
      `),
    ]);

    this.studyRoomSchemaCapabilities = {
      slug: Boolean(slugRows?.[0]?.exists),
      hostDetailsUpdatedAt: Boolean(hostRows?.[0]?.exists),
    };

    return this.studyRoomSchemaCapabilities;
  }

  private async updateExternalInvites(
    tx: Prisma.TransactionClient,
    studyRoomId: string,
    externalInvites?: ExternalInviteInputDto[],
  ) {
    await tx.studyRoomExternalInvite.deleteMany({ where: { studyRoomId } });
    if (!externalInvites || externalInvites.length === 0) return;
    await tx.studyRoomExternalInvite.createMany({
      data: externalInvites.map((invite) => ({
        studyRoomId,
        email: this.normalizeEmail(invite.email),
        role:
          invite.role === StudyRoomParticipantRoleDto.COHOST
            ? ExternalInviteRole.COHOST
            : ExternalInviteRole.PARTICIPANT,
      })),
      skipDuplicates: true,
    });
  }

  private async sendExternalInviteEmails(
    roomId: string,
    roomTitle: string,
    passcode: string,
    invites: ExternalInviteInputDto[],
  ): Promise<InviteEmailDeliverySummary> {
    if (invites.length === 0) {
      return {
        attempted: 0,
        sent: 0,
        failed: 0,
        failures: [],
      };
    }
    const roomLink = `https://webyalaya.com/studyroom/${roomId}`;
    const results = await Promise.all(
      invites.map(async (invite) => {
        const normalizedEmail = this.normalizeEmail(invite.email);
        const result = await this.emailService.sendDirectEmailNotification(
          normalizedEmail,
          `Invite to join "${roomTitle}"`,
          `You are invited as ${invite.role.toLowerCase()} to join "${roomTitle}". Use passcode ${passcode} and open ${roomLink} to join.`,
        );
        return {
          email: normalizedEmail,
          role: invite.role,
          ...result,
        };
      }),
    );

    const failures = results
      .filter((item) => !item.success)
      .map((item) => ({
        email: item.email,
        role: item.role,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
      }));

    const summary: InviteEmailDeliverySummary = {
      attempted: results.length,
      sent: results.filter((item) => item.success).length,
      failed: failures.length,
      failures,
    };

    this.logger.log({
      message: '📨 External invite email delivery summary',
      roomId,
      roomTitle,
      attempted: summary.attempted,
      sent: summary.sent,
      failed: summary.failed,
      failedRecipients: summary.failures,
    });
    return summary;
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

    // Create cache key from query parameters
    const cacheKey = this.cacheService.createKey('study-rooms:list', {
      search,
      skills: skills?.sort().join(','),
      status,
      dateFrom,
      dateTo,
      page,
      limit,
      createdById,
    });

    // Cache for 2 minutes - study rooms list changes frequently
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const dbStartTime = Date.now();
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

          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.warn(
              '[StudyRooms] Returning fallback empty study rooms due to connection error',
            );
            return {
              studyRooms: [],
              pagination: {
                total: 0,
                page,
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

  private async getTrendingStudyRooms(limit?: number) {
    const normalizedLimit = Math.max(1, limit ?? 6);
    const now = new Date();
    const isHomePageRequest = limit === 6;

    // Create cache key for trending rooms
    const cacheKey = this.cacheService.createKey('study-rooms:trending', {
      limit: normalizedLimit,
    });

    // Cache for 3 minutes - trending rooms change less frequently
    const cacheTTL = 180;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const dbStartTime = Date.now();
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
          const seenSlugs = new Set<string>();

          this.logger.debug({
            message: roomEntries,
            limit: normalizedLimit,
          });

          for (const entry of roomEntries) {
            if (!entry || seenSlugs.has(entry.room.slug!)) {
              continue;
            }

            seenSlugs.add(entry.room.slug!);
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

          const studyRoomCards = sortedRooms.map(
            ({ room, rating, reviewCount, totalSessions }) =>
              this.buildStudyRoomCard(room, {
                avgRating: rating,
                reviewCount,
                totalSessions,
              }),
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

          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.warn(
              isHomePageRequest
                ? '[HomePage] Returning fallback empty trending study rooms due to connection error'
                : '[StudyRooms] Returning fallback empty trending study rooms due to connection error',
            );
            return {
              studyRooms: [],
              pagination: {
                total: 0,
                page: 1,
                limit: normalizedLimit,
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

  private async getFallbackTrendingRooms(limit: number, fromDate: Date) {
    try {
      const studyRooms = await this.prisma.studyRoom.findMany({
        where: {
          sessionStatus: SessionStatus.UPCOMING,
          date: { gte: fromDate },
        },
        take: limit,
        distinct: ["slug"],
        orderBy: { date: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          imageUrl: true,
          sessionStatus: true,
          date: true,
          duration: true,
          maxParticipants: true,
          joiningFee: true,
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
            select: {
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
            ? hostReviews.reduce(
              (sum: number, r: { rating: number }) => sum + r.rating,
              0,
            ) / hostReviews.length
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
    } catch (error) {
      this.logger.warn({
        message: '[StudyRooms] Fallback trending rooms query failed; returning empty list',
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        studyRooms: [],
        pagination: {
          total: 0,
          page: 1,
          limit,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  private buildStudyRoomCard(
    room: StudyRoomWithRelations,
    rating?: {
      avgRating?: number;
      reviewCount?: number;
      totalSessions?: number;
    },
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
      isRecurring: (room as any).isRecurring,
      recurrenceMode: (room as any).recurrenceMode,
      seriesId: (room as any).seriesId,
      seriesRootId: (room as any).seriesRootId,
      occurrenceIndex: (room as any).occurrenceIndex,
      timezone: (room as any).timezone,
      participantCount: room.learners.length,
      slug:room.slug,
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
    try {
      const [studyRoom, currentUser] = await Promise.all([
        this.resolveStudyRoomByIdOrSlug(studyRoomId, {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            sessionStatus: true,
            date: true,
            duration: true,
            maxParticipants: true,
            joiningFee: true,
            createdById: true,
            summary: true,
            allowExternalUsers: true,
            externalAutoAccept: true,
            externalPasscode: true,
            isRecurring: true,
            recurrenceMode: true,
            seriesId: true,
            seriesRootId: true,
            occurrenceIndex: true,
            timezone: true,
            hostDetailsUpdatedAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            skills: {
              select: {
                id: true,
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
                id: true,
                userId: true,
                role: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    clerkId: true,
                  },
                },
              },
            },
            guestParticipants: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                livekitIdentity: true,
              },
            },
            externalInvites: {
              select: {
                email: true,
                role: true,
              },
            },
            externalJoinRequests: {
              where: { status: ExternalJoinRequestStatus.PENDING },
              select: { id: true },
            },
            reviews: {
              select: {
                id: true,
                rating: true,
                review: true,
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { id: 'desc' },
              take: 20,
            },
          },
        }),
        userId
          ? this.resolveUserIdentity(userId).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!studyRoom) {
        throw new NotFoundException('Study room not found');
      }

      const existingChannel = await this.prisma.channel.findFirst({
        where: { externalType: 'studyRoom', externalId: studyRoom.id },
        select: { id: true },
      });

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
        slug: (studyRoom as any).slug ?? studyRoomId,
        title: studyRoom.title,
        description: studyRoom.description,
        imageUrl: studyRoom.imageUrl,
        sessionStatus: studyRoom.sessionStatus,
        date: studyRoom.date,
        duration: studyRoom.duration,
        maxParticipants: studyRoom.maxParticipants,
        joiningFee: studyRoom.joiningFee,
        allowExternalUsers: (studyRoom as any).allowExternalUsers,
        externalAutoAccept: (studyRoom as any).externalAutoAccept,
        externalPasscode:
          role === 'teacher' ? (studyRoom as any).externalPasscode : null,
        externalInvites: ((studyRoom as any).externalInvites || []).map((invite: any) => ({
          email: invite.email,
          role:
            invite.role === ExternalInviteRole.COHOST
              ? StudyRoomParticipantRoleDto.COHOST
              : StudyRoomParticipantRoleDto.PARTICIPANT,
        })),
        pendingExternalJoinRequests: ((studyRoom as any).externalJoinRequests || [])
          .length,
        isRecurring: (studyRoom as any).isRecurring,
        recurrenceMode: (studyRoom as any).recurrenceMode,
        seriesId: (studyRoom as any).seriesId,
        seriesRootId: (studyRoom as any).seriesRootId,
        occurrenceIndex: (studyRoom as any).occurrenceIndex,
        timezone: (studyRoom as any).timezone,
        summary: studyRoom.summary,
        createdBy: studyRoom.createdBy,
        skills: studyRoom.skills.map((s) => s.skill),
        participants: studyRoom.learners.map((l) => ({
          ...l.user,
          role: l.role ?? StudyRoomParticipantRole.PARTICIPANT,
        })),
        guestParticipants: ((studyRoom as any).guestParticipants || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          email: g.email,
          role:
            g.role === StudyRoomParticipantRole.COHOST
              ? StudyRoomParticipantRoleDto.COHOST
              : StudyRoomParticipantRoleDto.PARTICIPANT,
          livekitIdentity: g.livekitIdentity,
        })),
        participantCount:
          studyRoom.learners.length +
          (((studyRoom as any).guestParticipants || []).length as number),
        cohostCount:
          studyRoom.learners.filter(
            (learner: any) => learner.role === StudyRoomParticipantRole.COHOST,
          ).length +
          (((studyRoom as any).guestParticipants || []).filter(
            (g: any) => g.role === StudyRoomParticipantRole.COHOST,
          ).length as number),
        role,
        reviews: studyRoom.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          review: r.review,
          reviewer: r.reviewer,
        })),
        chatChannelId: existingChannel?.id ?? null,
        hostDetailsUpdatedAt: (studyRoom as { hostDetailsUpdatedAt?: Date | null })
          .hostDetailsUpdatedAt ?? null,
      };
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getStudyRoomDetails for room ${studyRoomId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Re-throw NotFoundException (room not found is a valid case)
        if (error instanceof NotFoundException) {
          throw error;
        }

        // For connection errors, throw a more user-friendly error
        throw new NotFoundException(
          'Unable to fetch study room details. Please try again later.',
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  async createStudyRoom(userId: string, createDto: CreateStudyRoomDto) {
    const creator = await this.resolveUserIdentity(userId);
    const slugBase = createDto.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const uniqueHash = Math.random().toString(36).substring(2, 6);
    const seriesSlug = `${slugBase}-${uniqueHash}`;
    let occurrences;
    const normalizedExternalInvites = (createDto.externalInvites || []).map(
      (invite) => ({
        email: this.normalizeEmail(invite.email),
        role: invite.role,
      }),
    );
    const allowExternalUsers = !!createDto.allowExternalUsers;
    const externalPasscode = allowExternalUsers
      ? createDto.externalPasscode || this.generatePasscode()
      : null;
    try {
      occurrences = buildStudyRoomOccurrences({
        startDate: createDto.date,
        time: createDto.time,
        timezone: createDto.timezone,
        recurrence: createDto.recurrence,
      });
    } catch (error) {
      throw new BadRequestException({
        code: 'INVALID_RECURRENCE',
        message:
          error instanceof Error ? error.message : 'Invalid recurrence config',
      });
    }

    // Validate that first occurrence is not scheduled too far in the past.
    // Allow a small buffer (2 minutes) for instant rooms to account for form fill time.
    const now = new Date();
    const twoMinutesAgo = now.getTime() - 2 * 60 * 1000;
    if (occurrences[0].utcDate.getTime() < twoMinutesAgo) {
      throw new BadRequestException({
        code: 'PAST_TIME_NOT_ALLOWED',
        message: 'Study rooms cannot be scheduled in the past',
      });
    }

    const skills = await this.prisma.skill.findMany({
      where: { name: { in: createDto.skills } },
      select: { id: true },
    });
    const skillIds = skills.map((skill) => skill.id);

    const seriesId = createDto.recurrence ? randomUUID() : null;
    const recurrenceEndDate = createDto.recurrence
      ? convertLocalToUTC(
        createDto.recurrence.repeatUntil,
        createDto.time,
        createDto.timezone,
      )
      : null;
    const createdRooms = await this.prisma.$transaction(async (tx) => {
      const rows: Array<{ id: string; date: Date }> = [];

      for (const occurrence of occurrences) {
        const sessionStatus =
          occurrence.utcDate.getTime() <= now.getTime()
            ? SessionStatus.ONGOING
            : SessionStatus.UPCOMING;

        const created = await tx.studyRoom.create({
          data: {
            title: createDto.title,
            description: createDto.description,
            slug: seriesSlug,
            imageUrl: createDto.imageUrl,
            date: occurrence.utcDate,
            duration: createDto.duration,
            maxParticipants: createDto.maxParticipants,
            joiningFee: createDto.joiningFee || 0,
            sessionStatus,
            createdById: creator.id,
            isRecurring: !!createDto.recurrence,
            recurrenceMode: createDto.recurrence?.mode,
            seriesId,
            seriesRootId: null,
            occurrenceIndex: occurrence.occurrenceIndex,
            recurrenceEndDate,
            occurrenceDateLocal: convertLocalToUTC(
              occurrence.localDate,
              '00:00',
              createDto.timezone,
            ),
            timezone: createDto.timezone,
            allowExternalUsers,
            externalPasscode,
            externalAutoAccept:
              allowExternalUsers && !!createDto.externalAutoAccept,
            skills: {
              create: skillIds.map((skillId) => ({ skillId })),
            },
          },
          select: { id: true, date: true },
        });
        rows.push(created);
      }

      if (seriesId && rows.length > 0) {
        await tx.studyRoom.updateMany({
          where: { id: { in: rows.map((row) => row.id) } },
          data: { seriesRootId: rows[0].id },
        });
      }

      if (rows.length > 0 && allowExternalUsers) {
        await this.updateExternalInvites(
          tx,
          rows[0].id,
          normalizedExternalInvites,
        );
      }

      return rows;
    });

    for (const room of createdRooms) {
      await this.chatService.getOrCreateChannelForStudyRoom(room.id, [creator.id]);
    }

    let emailDelivery: InviteEmailDeliverySummary | undefined;
    if (
      allowExternalUsers &&
      externalPasscode &&
      normalizedExternalInvites.length > 0
    ) {
      emailDelivery = await this.sendExternalInviteEmails(
        createdRooms[0].id,
        createDto.title,
        externalPasscode,
        normalizedExternalInvites,
      );
    }

    const firstRoom = createdRooms[0];
    return {
      id: firstRoom.id,
      title: createDto.title,
      description: createDto.description ?? null,
      imageUrl: createDto.imageUrl ?? null,
      sessionStatus:
        firstRoom.date.getTime() <= now.getTime()
          ? SessionStatus.ONGOING
          : SessionStatus.UPCOMING,
      date: firstRoom.date,
      duration: createDto.duration,
      maxParticipants: createDto.maxParticipants,
      joiningFee: createDto.joiningFee || 0,
      createdBy: {
        id: creator.id,
        name: '',
        avatar: null,
      },
      skills: createDto.skills,
      participantCount: 0,
      participants: [],
      role: 'teacher',
      reviews: [],
      chatChannelId: null,
      summary: null,
      allowExternalUsers,
      externalAutoAccept: allowExternalUsers && !!createDto.externalAutoAccept,
      externalPasscode: allowExternalUsers ? externalPasscode : null,
      occurrencesCreated: createdRooms.length,
      slug: seriesSlug,
      isRecurring: !!createDto.recurrence,
      emailDelivery,
    };
  }

  async updateStudyRoom(
    studyRoomId: string,
    userId: string,
    updateDto: UpdateStudyRoomDto,
  ) {
    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        sessionStatus: true,
        date: true,
        duration: true,
        maxParticipants: true,
        joiningFee: true,
        createdById: true,
        seriesId: true,
        seriesRootId: true,
        occurrenceIndex: true,
        occurrenceDateLocal: true,
        timezone: true,
      },
    });

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    const actor = await this.resolveUserIdentity(userId);
    if (studyRoom.createdById !== actor.id) {
      throw new ForbiddenException(
        'Only the creator can update this study room',
      );
    }

    const studyRoomEditClosedStatuses: SessionStatus[] = [
      SessionStatus.DONE,
      SessionStatus.CANCELLED,
      SessionStatus.NOT_COMPLETED,
    ];
    if (studyRoomEditClosedStatuses.includes(studyRoom.sessionStatus)) {
      throw new BadRequestException(
        'Cannot edit this study room after the meeting has ended, been cancelled, or was marked not completed.',
      );
    }

    const editScope = updateDto.editScope ?? StudyRoomEditScope.SINGLE;
    const timezone = updateDto.timezone ?? studyRoom.timezone ?? 'UTC';

    const updateData: Prisma.StudyRoomUpdateManyMutationInput = {};
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
    if (updateDto.status) {
      updateData.sessionStatus = updateDto.status;
    }
    if (updateDto.timezone) {
      updateData.timezone = updateDto.timezone;
    }
    if (updateDto.allowExternalUsers !== undefined) {
      updateData.allowExternalUsers = updateDto.allowExternalUsers;
      if (!updateDto.allowExternalUsers) {
        updateData.externalPasscode = null;
        updateData.externalAutoAccept = false;
      }
    }
    if (updateDto.externalAutoAccept !== undefined) {
      updateData.externalAutoAccept = updateDto.externalAutoAccept;
    }
    if (updateDto.externalPasscode !== undefined) {
      updateData.externalPasscode = updateDto.externalPasscode;
    }

    if (updateDto.date || updateDto.time) {
      const oldDate = studyRoom.date.toISOString().split('T')[0];
      const oldTime = studyRoom.date.toISOString().substring(11, 16);
      updateData.date = convertLocalToUTC(
        updateDto.date ?? oldDate,
        updateDto.time ?? oldTime,
        timezone,
      );
    }

    const newScheduledStart =
      updateData.date != null
        ? new Date(updateData.date as Date)
        : studyRoom.date;
    const dateOrTimeChanged = Boolean(updateDto.date || updateDto.time);
    const willRegenerateSeries =
      !!updateDto.recurrence &&
      editScope !== StudyRoomEditScope.SINGLE &&
      !!studyRoom.seriesId;

    if (
      !willRegenerateSeries &&
      studyRoom.sessionStatus === SessionStatus.ONGOING &&
      updateDto.status === undefined &&
      dateOrTimeChanged &&
      newScheduledStart.getTime() > Date.now()
    ) {
      updateData.sessionStatus = SessionStatus.UPCOMING;
    }

    const updateFieldKeys = Object.keys(updateData);
    const hasNonStatusChange = updateFieldKeys.some(
      (k) => k !== 'sessionStatus',
    );
    const shouldMarkHostDetailsEdited =
      hasNonStatusChange ||
      updateDto.skills !== undefined ||
      updateDto.externalInvites !== undefined ||
      updateDto.allowExternalUsers !== undefined;
    if (shouldMarkHostDetailsEdited) {
      updateData.hostDetailsUpdatedAt = new Date();
    }

    const whereForScope: Prisma.StudyRoomWhereInput =
      editScope === StudyRoomEditScope.SINGLE || !studyRoom.seriesId
        ? { id: studyRoom.id }
        : editScope === StudyRoomEditScope.THIS_AND_FUTURE
          ? { seriesId: studyRoom.seriesId, date: { gte: studyRoom.date } }
          : { seriesId: studyRoom.seriesId };

    const targetRooms = await this.prisma.studyRoom.findMany({
      where: whereForScope,
      select: { id: true, date: true },
      orderBy: { date: 'asc' },
    });

    if (targetRooms.length === 0) {
      throw new NotFoundException(
        'No study room occurrences found for requested scope',
      );
    }

    const shouldRegenerateSeries =
      !!updateDto.recurrence &&
      editScope !== StudyRoomEditScope.SINGLE &&
      !!studyRoom.seriesId;

    if (shouldRegenerateSeries) {
      const startDate =
        updateDto.date ??
        (studyRoom.occurrenceDateLocal
          ? studyRoom.occurrenceDateLocal.toISOString().split('T')[0]
          : studyRoom.date.toISOString().split('T')[0]);
      const time =
        updateDto.time ?? studyRoom.date.toISOString().substring(11, 16);

      let regeneratedOccurrences;
      try {
        regeneratedOccurrences = buildStudyRoomOccurrences({
          startDate,
          time,
          timezone,
          recurrence: updateDto.recurrence,
        });
      } catch (error) {
        throw new BadRequestException({
          code: 'INVALID_RECURRENCE',
          message:
            error instanceof Error
              ? error.message
              : 'Invalid recurrence config',
        });
      }

      const skillIds =
        updateDto.skills && updateDto.skills.length > 0
          ? (
            await this.prisma.skill.findMany({
              where: { name: { in: updateDto.skills } },
              select: { id: true },
            })
          ).map((skill) => skill.id)
          : null;

      const createdRoomIds = await this.prisma.$transaction(async (tx) => {
        const createdIds: string[] = [];

        for (
          let i = 0;
          i < Math.max(targetRooms.length, regeneratedOccurrences.length);
          i++
        ) {
          const target = targetRooms[i];
          const occurrence = regeneratedOccurrences[i];

          if (target && occurrence) {
            await tx.studyRoom.update({
              where: { id: target.id },
              data: {
                ...updateData,
                date: occurrence.utcDate,
                occurrenceDateLocal: convertLocalToUTC(
                  occurrence.localDate,
                  '00:00',
                  timezone,
                ),
                occurrenceIndex: occurrence.occurrenceIndex,
                recurrenceMode: updateDto.recurrence!.mode,
                recurrenceEndDate: convertLocalToUTC(
                  updateDto.recurrence!.repeatUntil,
                  time,
                  timezone,
                ),
                timezone,
                isRecurring: true,
              },
            });

            if (skillIds) {
              await tx.studyRoomSkill.deleteMany({
                where: { studyRoomId: target.id },
              });
              if (skillIds.length > 0) {
                await tx.studyRoomSkill.createMany({
                  data: skillIds.map((skillId) => ({
                    studyRoomId: target.id,
                    skillId,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          } else if (target && !occurrence) {
            await tx.studyRoom.update({
              where: { id: target.id },
              data: {
                ...updateData,
                sessionStatus: SessionStatus.CANCELLED,
              },
            });
          } else if (!target && occurrence) {
            const created = await tx.studyRoom.create({
              data: {
                title: updateDto.title ?? studyRoom.title,
                description: updateDto.description ?? studyRoom.description,
                imageUrl: updateDto.imageUrl ?? studyRoom.imageUrl,
                date: occurrence.utcDate,
                duration: updateDto.duration ?? studyRoom.duration,
                maxParticipants:
                  updateDto.maxParticipants ?? studyRoom.maxParticipants,
                joiningFee:
                  updateDto.joiningFee ?? (studyRoom.joiningFee as any),
                sessionStatus: updateDto.status ?? SessionStatus.UPCOMING,
                createdById: studyRoom.createdById,
                isRecurring: true,
                recurrenceMode: updateDto.recurrence!.mode,
                seriesId: studyRoom.seriesId,
                seriesRootId: studyRoom.seriesRootId ?? studyRoom.id,
                occurrenceIndex: occurrence.occurrenceIndex,
                recurrenceEndDate: convertLocalToUTC(
                  updateDto.recurrence!.repeatUntil,
                  time,
                  timezone,
                ),
                occurrenceDateLocal: convertLocalToUTC(
                  occurrence.localDate,
                  '00:00',
                  timezone,
                ),
                timezone,
              },
              select: { id: true },
            });
            createdIds.push(created.id);

            const baseSkillIds = skillIds
              ? skillIds
              : (
                await tx.studyRoomSkill.findMany({
                  where: { studyRoomId: studyRoom.id },
                  select: { skillId: true },
                })
              ).map((row) => row.skillId);
            if (baseSkillIds.length > 0) {
              await tx.studyRoomSkill.createMany({
                data: baseSkillIds.map((skillId) => ({
                  studyRoomId: created.id,
                  skillId,
                })),
                skipDuplicates: true,
              });
            }
          }
        }

        return createdIds;
      });

      for (const createdId of createdRoomIds) {
        await this.chatService.getOrCreateChannelForStudyRoom(createdId, [
          studyRoom.createdById,
        ]);
      }

      if (shouldMarkHostDetailsEdited) {
        await this.notifyStudyRoomLearnersDetailsUpdated(
          targetRooms.map((r) => r.id),
          studyRoom.createdById,
          updateDto.title?.trim() ?? studyRoom.title,
          studyRoom.id,
        );
      }

      return this.getStudyRoomDetails(studyRoom.id, userId);
    }

    await this.prisma.studyRoom.updateMany({
      where: whereForScope,
      data: updateData,
    });

    if (updateDto.skills) {
      const skillIds = (
        await this.prisma.skill.findMany({
          where: { name: { in: updateDto.skills } },
          select: { id: true },
        })
      ).map((skill) => skill.id);

      await this.prisma.$transaction(async (tx) => {
        for (const room of targetRooms) {
          await tx.studyRoomSkill.deleteMany({
            where: { studyRoomId: room.id },
          });
          if (skillIds.length > 0) {
            await tx.studyRoomSkill.createMany({
              data: skillIds.map((skillId) => ({
                studyRoomId: room.id,
                skillId,
              })),
              skipDuplicates: true,
            });
          }
        }
      });
    }

    if (
      updateDto.externalInvites !== undefined ||
      updateDto.allowExternalUsers === false
    ) {
      await this.prisma.$transaction(async (tx) => {
        for (const room of targetRooms) {
          await tx.studyRoomExternalInvite.deleteMany({
            where: { studyRoomId: room.id },
          });
          if (updateDto.allowExternalUsers === false) {
            continue;
          }
          if ((updateDto.externalInvites || []).length > 0) {
            await tx.studyRoomExternalInvite.createMany({
              data: (updateDto.externalInvites || []).map((invite) => ({
                studyRoomId: room.id,
                email: this.normalizeEmail(invite.email),
                role:
                  invite.role === StudyRoomParticipantRoleDto.COHOST
                    ? ExternalInviteRole.COHOST
                    : ExternalInviteRole.PARTICIPANT,
              })),
              skipDuplicates: true,
            });
          }
        }
      });
    }

    if (shouldMarkHostDetailsEdited) {
      await this.notifyStudyRoomLearnersDetailsUpdated(
        targetRooms.map((r) => r.id),
        studyRoom.createdById,
        updateDto.title?.trim() ?? studyRoom.title,
        studyRoom.id,
      );
    }

    return this.getStudyRoomDetails(studyRoom.id, userId);
  }

  async joinStudyRoom(studyRoomId: string, userId: string) {
    const actor = await this.resolveUserIdentity(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, coins: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      include: {
        learners: true,
        guestParticipants: true,
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

    if (
      studyRoom.learners.length + studyRoom.guestParticipants.length >=
      studyRoom.maxParticipants
    ) {
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
          studyRoomId: studyRoom.id,
          amountMade: studyRoom.joiningFee,
          amountReceived: studyRoom.joiningFee,
        },
      });

      // Add participant
      await tx.studyRoomParticipant.create({
        data: {
          userId: user.id, // Use the database ID, not clerkId
          studyRoomId: studyRoom.id,
          role: StudyRoomParticipantRole.PARTICIPANT,
        },
      });
    });

    // Get all participants (creator + learners) for the chat channel
    const allParticipants = await this.prisma.studyRoomParticipant.findMany({
      where: { studyRoomId: studyRoom.id },
      select: { userId: true },
    });
    const participantIds = [
      studyRoom.createdById,
      ...allParticipants.map((p) => p.userId),
    ];

    // Ensure chat channel exists and add the new member
    await this.chatService.getOrCreateChannelForStudyRoom(
      studyRoom.id,
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
        studyRoomId: studyRoom.id,
        actionData: { sessionId: studyRoom.id, sessionType: 'studyRoom' },
      },
    );

    this.logger.log('✅ [joinStudyRoom] Notification sent successfully');

    return {
      success: true,
      message: 'Successfully joined study room',
    };
  }

  async requestExternalJoin(
    studyRoomId: string,
    dto: ExternalJoinRequestDto,
  ): Promise<
    | { status: 'PENDING'; message: string }
    | {
      status: 'APPROVED';
      message: string;
      guestAccessToken: string;
      participantIdentity: string;
      role: StudyRoomParticipantRole;
    }
  > {
    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      include: {
        externalInvites: true,
        learners: true,
        guestParticipants: true,
      },
    });
    if (!studyRoom) throw new NotFoundException('Study room not found');
    if (!studyRoom.allowExternalUsers) {
      throw new BadRequestException(
        'External access is disabled for this room',
      );
    }
    if (
      !studyRoom.externalPasscode ||
      studyRoom.externalPasscode !== dto.passcode
    ) {
      throw new BadRequestException('Invalid passcode');
    }
    const normalizedEmail = this.normalizeEmail(dto.email);
    const invite = studyRoom.externalInvites.find(
      (item) => item.email === normalizedEmail,
    );
    const existingGuestParticipant = studyRoom.guestParticipants.find(
      (item) => item.email === normalizedEmail,
    );

    // If this guest was already approved previously, issue a fresh access token and let them in instantly.
    if (existingGuestParticipant) {
      const role = invite
        ? this.toParticipantRole(invite.role)
        : existingGuestParticipant.role;
      const participant = await this.prisma.studyRoomGuestParticipant.update({
        where: { id: existingGuestParticipant.id },
        data: {
          name: dto.name.trim(),
          role,
        },
      });
      const guestAccessToken = await this.issueGuestAccessToken(
        studyRoom.id,
        participant.id,
      );
      return {
        status: 'APPROVED',
        message: 'Approved. You can join now.',
        guestAccessToken,
        participantIdentity: participant.livekitIdentity,
        role: participant.role,
      };
    }

    if (
      studyRoom.learners.length + studyRoom.guestParticipants.length >=
      studyRoom.maxParticipants
    ) {
      throw new BadRequestException({
        code: 'ROOM_FULL',
        message: 'Study room is at capacity',
      });
    }

    const shouldApprove = !!invite || studyRoom.externalAutoAccept;
    if (!shouldApprove) {
      const existingPendingRequest =
        await this.prisma.studyRoomExternalJoinRequest.findFirst({
          where: {
            studyRoomId: studyRoom.id,
            email: normalizedEmail,
            status: ExternalJoinRequestStatus.PENDING,
          },
          orderBy: { createdAt: 'desc' },
        });
      if (existingPendingRequest) {
        return {
          status: 'PENDING',
          message: 'Join request sent to host for approval',
        };
      }

      await this.prisma.studyRoomExternalJoinRequest.create({
        data: {
          studyRoomId: studyRoom.id,
          name: dto.name.trim(),
          email: normalizedEmail,
          status: ExternalJoinRequestStatus.PENDING,
        },
      });
      return {
        status: 'PENDING',
        message: 'Join request sent to host for approval',
      };
    }

    const role = this.toParticipantRole(invite?.role);
    const participant = await this.prisma.studyRoomGuestParticipant.upsert({
      where: {
        studyRoomId_email: {
          studyRoomId: studyRoom.id,
          email: normalizedEmail,
        },
      },
      update: {
        name: dto.name.trim(),
        role,
      },
      create: {
        studyRoomId: studyRoom.id,
        name: dto.name.trim(),
        email: normalizedEmail,
        role,
        livekitIdentity: `guest-${randomUUID()}`,
      },
    });
    const guestAccessToken = await this.issueGuestAccessToken(
      studyRoom.id,
      participant.id,
    );
    return {
      status: 'APPROVED',
      message: 'Approved. You can join now.',
      guestAccessToken,
      participantIdentity: participant.livekitIdentity,
      role,
    };
  }

  async joinRecurringStudyRoom(
    studyRoomId: string, 
    userId: string, 
    dto: { scope: 'THIS' | 'FOLLOWING' }
) {

  if (dto.scope === 'THIS') {
    return this.joinStudyRoom(studyRoomId, userId);
  }

  const currentRoom = await this.prisma.studyRoom.findUnique({
    where: { id: studyRoomId },
    select: { seriesId: true, date: true }
  });

  if (!currentRoom?.seriesId) {
    return this.joinStudyRoom(studyRoomId, userId);
  }

  const futureRooms = await this.prisma.studyRoom.findMany({
    where: {
      seriesId: currentRoom.seriesId,
      date: { gte: currentRoom.date },
    },
    orderBy: { date: 'asc' },
    select: { id: true }
  });

  const successfulJoins : string[] = [];
  for (const room of futureRooms) {
    try {
      
      await this.joinStudyRoom(room.id, userId);
      successfulJoins.push(room.id);
    } catch (error) {
      
      if (error.status === 400 && error.message.includes('INSUFFICIENT_COINS')) {
        break; 
      }
      this.logger.warn(`Skipped room ${room.id} in recurring join: ${error.message}`);
    }
  }

  return {
    success: true,
    message: `Joined ${successfulJoins.length} sessions in the series`,
  };
}


  async unenroll(userId: string, targetId: string, scope: "THIS" | "ALL" | "FOLLOWING") {
    if (scope === "ALL") {
      const result = await this.prisma.studyRoomParticipant.deleteMany({
        where: {
          userId: userId,
          studyRoom: {
            seriesId: targetId, 
          },
        },
      });
      return { message: `Unenrolled from ${result.count} sessions in the series.` };
    }
    
    await this.prisma.studyRoomParticipant.delete({
      where: {
        userId_studyRoomId: {
          userId: userId,
          studyRoomId: targetId, 
        },
      },
    });
    
    return { message: 'Unenrolled from this session.' };
  }

  private async assertHostOrCohost(studyRoomId: string, userId: string) {
    const room = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      include: {
        learners: {
          where: { userId },
          select: { role: true },
        },
      },
    });
    if (!room) throw new NotFoundException('Study room not found');
    const isHost = room.createdById === userId;
    const isCohost = room.learners.some(
      (p) => p.role === StudyRoomParticipantRole.COHOST,
    );
    if (!isHost && !isCohost) {
      throw new ForbiddenException('Only host/cohost can perform this action');
    }
    return { room, user: { id: userId } };
  }

  async listPendingExternalJoinRequests(studyRoomId: string, userId: string) {
    const { room } = await this.assertHostOrCohost(studyRoomId, userId);
    const requests = await this.prisma.studyRoomExternalJoinRequest.findMany({
      where: {
        studyRoomId: room.id,
        status: ExternalJoinRequestStatus.PENDING,
      },
      orderBy: { createdAt: 'asc' },
    });
    return { requests };
  }

  async resolveExternalJoinRequest(
    studyRoomId: string,
    requestId: string,
    userId: string,
    approve: boolean,
  ) {
    const { room, user } = await this.assertHostOrCohost(studyRoomId, userId);
    const request = await this.prisma.studyRoomExternalJoinRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.studyRoomId !== room.id) {
      throw new NotFoundException('Join request not found');
    }
    if (request.status !== ExternalJoinRequestStatus.PENDING) {
      throw new BadRequestException('Join request is already resolved');
    }

    if (!approve) {
      await this.prisma.studyRoomExternalJoinRequest.update({
        where: { id: requestId },
        data: {
          status: ExternalJoinRequestStatus.REJECTED,
          decidedAt: new Date(),
          decidedBy: user.id,
        },
      });
      return { success: true, status: ExternalJoinRequestStatus.REJECTED };
    }

    const participantCount =
      (await this.prisma.studyRoomParticipant.count({
        where: { studyRoomId: room.id },
      })) +
      (await this.prisma.studyRoomGuestParticipant.count({
        where: { studyRoomId: room.id },
      }));
    if (participantCount >= room.maxParticipants) {
      throw new BadRequestException({
        code: 'ROOM_FULL',
        message: 'Study room is at capacity',
      });
    }

    const invite = await this.prisma.studyRoomExternalInvite.findUnique({
      where: {
        studyRoomId_email: {
          studyRoomId: room.id,
          email: request.email,
        },
      },
    });
    const role = this.toParticipantRole(invite?.role);
    const participant = await this.prisma.studyRoomGuestParticipant.upsert({
      where: {
        studyRoomId_email: {
          studyRoomId: room.id,
          email: request.email,
        },
      },
      update: {
        name: request.name,
        role,
        approvedBy: user.id,
      },
      create: {
        studyRoomId: room.id,
        name: request.name,
        email: request.email,
        role,
        livekitIdentity: `guest-${randomUUID()}`,
        approvedBy: user.id,
      },
    });
    const guestAccessToken = await this.issueGuestAccessToken(
      room.id,
      participant.id,
    );
    await this.prisma.studyRoomExternalJoinRequest.update({
      where: { id: requestId },
      data: {
        status: ExternalJoinRequestStatus.APPROVED,
        decidedAt: new Date(),
        decidedBy: user.id,
      },
    });
    return {
      success: true,
      status: ExternalJoinRequestStatus.APPROVED,
      guestAccessToken,
      participantIdentity: participant.livekitIdentity,
    };
  }

  async setExternalAutoAccept(
    studyRoomId: string,
    clerkId: string,
    enabled: boolean,
  ) {
    const { room } = await this.assertHostOrCohost(studyRoomId, clerkId);
    await this.prisma.studyRoom.update({
      where: { id: room.id },
      data: { externalAutoAccept: enabled },
    });
    return { success: true, externalAutoAccept: enabled };
  }

  async updateParticipantRole(
    studyRoomId: string,
    userId: string,
    participantIdentity: string,
    role: StudyRoomParticipantRoleDto,
  ) {
    const { room } = await this.assertHostOrCohost(studyRoomId, userId);
    const nextRole = this.toParticipantRole(role);

    const user = await this.prisma.user.findUnique({
      where: { clerkId: participantIdentity },
      select: { id: true },
    });
    if (user) {
      await this.prisma.studyRoomParticipant.updateMany({
        where: { studyRoomId: room.id, userId: user.id },
        data: { role: nextRole },
      });
      return { success: true, role: nextRole };
    }

    await this.prisma.studyRoomGuestParticipant.updateMany({
      where: { studyRoomId: room.id, livekitIdentity: participantIdentity },
      data: { role: nextRole },
    });
    return { success: true, role: nextRole };
  }

  async validateGuestAccessToken(studyRoomId: string, accessToken: string) {
    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: { id: true },
    });
    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    const token = await this.prisma.studyRoomGuestAccessToken.findUnique({
      where: { token: accessToken },
      include: {
        guestParticipant: true,
        studyRoom: true,
      },
    });
    if (!token || token.studyRoomId !== studyRoom.id) {
      throw new ForbiddenException('Invalid guest access token');
    }
    if (token.expiresAt < new Date()) {
      throw new ForbiddenException('Guest access token expired');
    }
    return token;
  }

  async cancelStudyRoom(
    studyRoomId: string,
    userId: string,
    editScope: StudyRoomEditScope = StudyRoomEditScope.SINGLE,
  ) {
    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: { id: true, createdById: true, seriesId: true, date: true },
    });

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    if (studyRoom.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can cancel this study room',
      );
    }

    const whereForScope: Prisma.StudyRoomWhereInput =
      editScope === StudyRoomEditScope.SINGLE || !studyRoom.seriesId
        ? { id: studyRoom.id }
        : editScope === StudyRoomEditScope.THIS_AND_FUTURE
          ? { seriesId: studyRoom.seriesId, date: { gte: studyRoom.date } }
          : { seriesId: studyRoom.seriesId };

    const result = await this.prisma.studyRoom.updateMany({
      where: {
        ...whereForScope,
        sessionStatus: {
          in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
        },
      },
      data: { sessionStatus: SessionStatus.CANCELLED },
    });

    return {
      success: true,
      updatedCount: result.count,
      message: 'Study room cancelled successfully',
    };
  }

  async completeStudyRoom(studyRoomId: string, userId: string) {
    this.logger.debug({
      message: '🎯 [completeStudyRoom] Called with',
      studyRoomId,
      userId,
    });

    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: {
        id: true,
        title: true,
        date: true,
        duration: true,
        createdById: true,
      },
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
        studyRoomId: studyRoom.id,
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
    this.logger.debug(
      '📝 [completeStudyRoom] Updating study room status to DONE...',
    );
    const updatedRoom = await this.prisma.studyRoom.update({
      where: { id: studyRoom.id },
      data: { sessionStatus: SessionStatus.DONE },
    });
    this.logger.log('✅ [completeStudyRoom] Study room status updated to DONE');

    // Get all participants for streak tracking
    const participants = await this.prisma.studyRoomParticipant.findMany({
      where: { studyRoomId: studyRoom.id },
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
      summary = await this.transcriptsService.compileAndSummarize(studyRoom.id);

      // Store summary in database
      await this.prisma.studyRoom.update({
        where: { id: studyRoom.id },
        data: { summary },
      });
      this.logger.log(
        '✅ [completeStudyRoom] AI summary generated and stored successfully',
      );
    } catch (error) {
      this.logger.error(
        '⚠️ [completeStudyRoom] Failed to generate summary',
        error instanceof Error ? error.stack : undefined,
        `studyRoomId: ${studyRoomId}, error: ${error instanceof Error ? error.message : String(error)}`,
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
    const [studyRoom, user] = await Promise.all([
      this.resolveStudyRoomByIdOrSlug(studyRoomId, {
        select: { id: true, createdById: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    ]);

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    const guestParticipant = await this.prisma.studyRoomGuestParticipant.findFirst({
      where: { studyRoomId: studyRoom.id, livekitIdentity: userId },
      select: { role: true },
    });

    if (user) {
      if (studyRoom.createdById === user.id) {
        return { isHost: true };
      }
      const participant = await this.prisma.studyRoomParticipant.findFirst({
        where: { studyRoomId: studyRoom.id, userId: user.id },
        select: { role: true },
      });
      return { isHost: participant?.role === StudyRoomParticipantRole.COHOST };
    }

    return {
      isHost: guestParticipant?.role === StudyRoomParticipantRole.COHOST,
    };
  }

  async markNotCompleted(studyRoomId: string, userId: string) {
    this.logger.debug({
      message: '⏰ [markNotCompleted] Called with',
      studyRoomId,
      clerkUserId: userId,
    });

    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      this.logger.error({
        message: '❌ [markNotCompleted] User not found for clerkId',
        clerkUserId: userId,
      });
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
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
    this.logger.debug(
      '📝 [markNotCompleted] Updating study room status to NOT_COMPLETED...',
    );
    const updatedRoom = await this.prisma.studyRoom.update({
      where: { id: studyRoom.id },
      data: { sessionStatus: SessionStatus.NOT_COMPLETED },
    });
    this.logger.log(
      '✅ [markNotCompleted] Study room status updated to NOT_COMPLETED',
    );

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
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studyRoom = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
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
        studyRoomId: studyRoom.id,
      },
    });

    // Store all answers as JSON (cast to Prisma's InputJsonValue type)
    const answersJson = (feedbackDto.answers ||
      {}) as unknown as Prisma.InputJsonValue;

    if (existingFeedback) {
      // Update existing feedback
      await this.prisma.sessionFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          isHost: feedbackDto.isHost,
          answers: answersJson,
        },
      });

      this.logger.log(
        '✅ [saveSessionFeedback] Feedback updated for study room',
        studyRoomId,
      );
    } else {
      // Create new feedback entry
      await this.prisma.sessionFeedback.create({
        data: {
          userId: user.id,
          studyRoomId: studyRoom.id,
          isHost: feedbackDto.isHost,
          answers: answersJson,
        },
      });

      this.logger.log(
        '✅ [saveSessionFeedback] Feedback created for study room',
        studyRoomId,
      );
    }

    return {
      success: true,
      message: 'Feedback submitted successfully',
      studyRoomId,
    };
  }

  /** Notify enrolled learners (and co-hosts) when the teacher updates session details. */
  private async notifyStudyRoomLearnersDetailsUpdated(
    roomIds: string[],
    hostUserId: string,
    titleSnippet: string,
    primaryStudyRoomId: string,
  ) {
    if (roomIds.length === 0) return;
    const rows = await this.prisma.studyRoomParticipant.findMany({
      where: { studyRoomId: { in: roomIds } },
      select: { userId: true, studyRoomId: true },
    });
    /** One notification per user; link to the occurrence they joined (not only the edited row). */
    const userToRoomId = new Map<string, string>();
    for (const row of rows) {
      if (row.userId === hostUserId) continue;
      if (!userToRoomId.has(row.userId)) {
        userToRoomId.set(row.userId, row.studyRoomId);
      }
    }
    if (userToRoomId.size === 0) return;
    const timeLabel = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    const safeTitle =
      titleSnippet.length > 80 ? `${titleSnippet.slice(0, 77)}…` : titleSnippet;
    const message = `The session you enrolled in (“${safeTitle}”) has updated details (${timeLabel}).`;
    for (const [uid, studyRoomIdForLink] of userToRoomId) {
      try {
        await this.notificationsService.createAndPushNotification(
          uid,
          message,
          'Study session updated',
          NotifType.NORMAL,
          {
            actionType: 'STUDY_ROOM_DETAILS_UPDATED',
            studyRoomId: studyRoomIdForLink,
            actionData: {
              sessionId: studyRoomIdForLink,
              sessionType: 'studyRoom',
            },
          },
        );
      } catch (err) {
        this.logger.error(
          `Failed to notify user ${uid} of study room details update (${primaryStudyRoomId})`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }
}
