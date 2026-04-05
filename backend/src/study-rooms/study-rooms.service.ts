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
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { EmailService, EmailDeliveryResult } from '../email/email.service';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { EngagementService } from '../engagement/engagement.service';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../common/logger/logger.service';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';
import {
  CreateStudyRoomDto,
  RegisterWebinarDto,
  StudyRoomEditScope,
  StudyRoomSessionModeDto,
  UpdateStudyRoomDto,
} from './dto/study-room.dto';
import { SessionFeedbackDto } from '../common/dto/session-feedback.dto';
import {
  Prisma,
  SessionStatus,
  NotifType,
  PaymentStatus,
  StudyRoomParticipantRole,
  StudyRoomSessionMode,
} from '../generated/prisma/client';
import { convertLocalToUTC } from '../utils/timezone';
import { buildStudyRoomOccurrences } from './recurrence.util';
import { StudyRoomParticipantRoleDto } from './dto/study-room.dto';
import { createClerkClient } from '@clerk/backend';

type StudyRoomWithRelations = {
  id: string;
  title: string;
  slug?: string | null
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

@Injectable()
export class StudyRoomsService {
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });
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
    private engagementService: EngagementService,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService,
  ) {
    this.logger.setContext(StudyRoomsService.name);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generatePasscode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** Opaque per-registration token embedded in the emailed join URL. */
  private generateJoinLinkToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Public browser origin for links in emails and API responses (must be absolute http(s)).
   * Never returns empty: path-only links in HTML email resolve as http://webinar/join in Gmail.
   */
  private resolveAppPublicBaseUrl(): string {
    const raw =
      process.env.FRONTEND_URL?.trim() ||
      process.env.APP_PUBLIC_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      '';
    if (raw) {
      const normalized = raw.replace(/\/$/, '');
      if (/^https?:\/\//i.test(normalized)) {
        return normalized;
      }
      this.logger.warn(
        `FRONTEND_URL / APP_PUBLIC_URL / NEXT_PUBLIC_APP_URL must be an absolute URL (e.g. http://localhost:3000). Got "${raw}" — ignoring.`,
      );
    }
    const siteFallback =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      '';
    if (siteFallback && /^https?:\/\//i.test(siteFallback)) {
      return siteFallback.replace(/\/$/, '');
    }
    const apiUrl = process.env.API_URL?.trim() || '';
    if (/^https?:\/\/127\.0\.0\.1:\d+/i.test(apiUrl) || /^https?:\/\/localhost:\d+/i.test(apiUrl)) {
      return 'http://localhost:3000';
    }
    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:3000';
    }
    this.logger.warn(
      'FRONTEND_URL not set — webinar links default to http://localhost:3000. Set FRONTEND_URL to your public site (e.g. https://webyalaya.com) in production.',
    );
    return 'http://localhost:3000';
  }

  private buildWebinarJoinUrl(studyRoomId: string, joinLinkToken: string): string {
    const base = this.resolveAppPublicBaseUrl().replace(/\/$/, '');
    const path = `/webinar/join?room=studyroom-${studyRoomId}&token=${encodeURIComponent(joinLinkToken)}`;
    return `${base}${path}`;
  }

  private buildWebinarWaitingUrl(studyRoomId: string, joinLinkToken: string): string {
    const base = this.resolveAppPublicBaseUrl().replace(/\/$/, '');
    const path = `/webinar/waiting?room=studyroom-${studyRoomId}&token=${encodeURIComponent(joinLinkToken)}`;
    return `${base}${path}`;
  }

  private mergeWebinarConfig(
    input?: Record<string, unknown>,
  ): Record<string, unknown> {
    const base = {
      registrationFields: [
        { id: 'name', label: 'Full name', required: true, type: 'text' },
        { id: 'email', label: 'Email', required: true, type: 'email' },
      ],
      permissions: {
        mic: 'disabled',
        video: 'disabled',
        chat: 'host_only',
        screenShare: 'host_only',
      },
      /** Host can toggle chat live without editing full config */
      runtime: {
        chatEnabled: true,
        /** When false, guests are auto-approved; no Admit step in host panel. */
        waitingRoomEnabled: true,
      },
    };
    if (!input) return base;
    const permIn = (input.permissions as Record<string, unknown>) || {};
    const runIn = (input.runtime as Record<string, unknown>) || {};
    return {
      ...base,
      ...input,
      permissions: {
        ...(base.permissions as Record<string, unknown>),
        ...permIn,
      },
      runtime: {
        ...(base.runtime as Record<string, unknown>),
        ...runIn,
      },
      registrationFields: Array.isArray(input.registrationFields)
        ? input.registrationFields
        : base.registrationFields,
    };
  }

  private toParticipantRole(
    role?: StudyRoomParticipantRoleDto | StudyRoomParticipantRole,
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
      select: { id: true, clerkId: true, name: true },
    });

    if (byId) {
      return byId;
    }

    const byClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userIdOrClerkId },
      select: { id: true, clerkId: true, name: true },
    });

    if (byClerkId) {
      try {
        const clerkUser = await this.clerkClient.users.getUser(userIdOrClerkId);
        await this.clerkClient.users.updateUser(userIdOrClerkId, {
          publicMetadata: {
            ...(clerkUser.publicMetadata || {}),
            onboardingComplete: true,
            dbUserId: byClerkId.id,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to sync Clerk metadata for ${userIdOrClerkId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return byClerkId;
    }

    throw new NotFoundException('User not found');
  }

  private async notifyFollowersAboutStudyRoom(opts: {
    hostId: string;
    hostName: string | null;
    roomId: string;
    roomTitle: string;
    startsAt: Date;
    isLive: boolean;
  }) {
    const followers = await this.prisma.userFollow.findMany({
      where: { followingId: opts.hostId },
      select: { followerId: true },
    });

    if (followers.length === 0) {
      return;
    }

    const hostName = opts.hostName || 'Someone you follow';
    const message = opts.isLive
      ? `${hostName} started ${opts.roomTitle}. Join now.`
      : `${hostName} scheduled ${opts.roomTitle}.`;

    await Promise.all(
      followers.map((follow) =>
        this.notificationsService.createAndPushNotification(
          follow.followerId,
          message,
          'New study room from someone you follow',
          NotifType.NORMAL,
          {
            actionType: 'FOLLOWING_STUDYROOM_CREATED',
            studyRoomId: opts.roomId,
            actionData: {
              studyRoomId: opts.roomId,
              hostUserId: opts.hostId,
              startsAt: opts.startsAt.toISOString(),
              isLive: opts.isLive,
            },
          },
        ),
      ),
    );
  }

  private isSlug(key: string) {
    return key.includes("-");
  }
  private async resolveStudyRoomByIdOrSlug(
    studyRoomIdOrSlug: string,
    options?: { select?: any; include?: any },
  ): Promise<any> {
    this.logger.log("ROOM ID OR SLUG : : : ", studyRoomIdOrSlug)

     const baseOptions = {
        ...(options?.select ? { select: options.select } : {}),
        ...(options?.include ? { include: options.include } : {}),
      };

      if (!this.isSlug(studyRoomIdOrSlug)) {
        return this.prisma.studyRoom.findUnique({
          where: { id: studyRoomIdOrSlug },
          ...baseOptions,
        });
      }

      // its slug
       const rooms = await this.prisma.studyRoom.findMany({
          where: { slug: studyRoomIdOrSlug },
          orderBy: { date: "asc" },
          ...baseOptions,
        });

        // snigle  room  with slug  OR a sigle sessio in a series
        if (rooms.length === 1) {
          return rooms[0];
        }
        // a series 
        if (rooms.length > 1) {
          const now = new Date();

          return (
            rooms.find(r => r.sessionStatus === "ONGOING") ||
            rooms.find(r => r.sessionStatus === "UPCOMING") ||
            rooms[0]
          );
        }

        return null;
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
      slug: room.slug,
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
            slug:true, // please dont remove slugs 
            description: true,
            imageUrl: true,
            sessionStatus: true,
            date: true,
            duration: true,
            maxParticipants: true,
            joiningFee: true,
            createdById: true,
            summary: true,
            isRecurring: true,
            recurrenceMode: true,
            seriesId: true,
            seriesRootId: true,
            occurrenceIndex: true,
            timezone: true,
            hostDetailsUpdatedAt: true,
            sessionMode: true,
            webinarConfig: true,
            webinarRegistrationSlug: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
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
              orderBy: { id: 'asc' },
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
        sessionMode: (studyRoom as { sessionMode?: StudyRoomSessionMode })
          .sessionMode ?? StudyRoomSessionMode.STANDARD,
        webinarConfig: (studyRoom as { webinarConfig?: unknown }).webinarConfig ?? null,
        webinarRegistrationSlug:
          role === 'teacher'
            ? (studyRoom as { webinarRegistrationSlug?: string | null })
              .webinarRegistrationSlug ?? null
            : null,
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

  // async createRecurringStudyRoom(userId: string, createDto: CreateStudyRoomDto){
  //    const creator = await this.resolveUserIdentity(userId);
  //   const slugBase = createDto.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  //   const uniqueHash = Math.random().toString(36).substring(2, 6);
  //   const seriesSlug = `${slugBase}-${uniqueHash}`;
  //   let occurrences;
  //   const normalizedExternalInvites = (createDto.externalInvites || []).map(
  //     (invite) => ({
  //       email: this.normalizeEmail(invite.email),
  //       role: invite.role,
  //     }),
  //   );
  //   const allowExternalUsers = !!createDto.allowExternalUsers;
  //   const externalPasscode = allowExternalUsers
  //     ? createDto.externalPasscode || this.generatePasscode()
  //     : null;
  //   try {
  //     occurrences = buildStudyRoomOccurrences({
  //       startDate: createDto.date,
  //       time: createDto.time,
  //       timezone: createDto.timezone,
  //       recurrence: createDto.recurrence,
  //     });
  //   } catch (error) {
  //     throw new BadRequestException({
  //       code: 'INVALID_RECURRENCE',
  //       message:
  //         error instanceof Error ? error.message : 'Invalid recurrence config',
  //     });
  //   }

  //   // Validate that first occurrence is not scheduled too far in the past.
  //   // Allow a small buffer (2 minutes) for instant rooms to account for form fill time.
  //   const now = new Date();
  //   const twoMinutesAgo = now.getTime() - 2 * 60 * 1000;
  //   if (occurrences[0].utcDate.getTime() < twoMinutesAgo) {
  //     throw new BadRequestException({
  //       code: 'PAST_TIME_NOT_ALLOWED',
  //       message: 'Study rooms cannot be scheduled in the past',
  //     });
  //   }

  //   const skills = await this.prisma.skill.findMany({
  //     where: { name: { in: createDto.skills } },
  //     select: { id: true },
  //   });
  //   const skillIds = skills.map((skill) => skill.id);

  //   const seriesId = createDto.recurrence ? randomUUID() : null;
  //   const recurrenceEndDate = createDto.recurrence
  //     ? convertLocalToUTC(
  //       createDto.recurrence.repeatUntil,
  //       createDto.time,
  //       createDto.timezone,
  //     )
  //     : null;


  //     const roomData = occurrences.map((occ) => ({
  //       id: randomUUID(),
  //       title: createDto.title,
  //       description: createDto.description,
  //       slug: seriesSlug,
  //       imageUrl: createDto.imageUrl,
  //       date: occ.utcDate,
  //       duration: createDto.duration,
  //       maxParticipants: createDto.maxParticipants,
  //       joiningFee: createDto.joiningFee || 0,
  //       sessionStatus: occ.utcDate.getTime() <= now.getTime() ? 'ONGOING' : 'UPCOMING',
  //       createdById: creator.id,
  //       isRecurring: !!createDto.recurrence,
  //       seriesId,
  //       occurrenceIndex: occ.occurrenceIndex,
  //       timezone: createDto.timezone,
  //       allowExternalUsers: !!createDto.allowExternalUsers,
  //       externalPasscode: createDto.allowExternalUsers ? (createDto.externalPasscode || this.generatePasscode()) : null,
  //     }));

  //     const rootId = roomData[0].id;

  //     const result = await this.prisma.$transaction(async (tx) => {
  //         await tx.studyRoom.createMany({
  //           data: roomData.map(room => ({
  //             ...room,
  //             seriesRootId: rootId,
  //           }))
  //         });

  //         if (skillIds.length > 0) {
  //           const skillRelations = roomData.flatMap(room => 
  //             skillIds.map(skillId => ({ studyRoomId: room.id, skillId }))
  //           );
  //           await tx.studyRoomSkill.createMany({ data: skillRelations });
  //         }

  //         if (createDto.allowExternalUsers && createDto.externalInvites?.length) {
  //           const normalizedInvites = createDto.externalInvites.map(i => ({
  //             email: this.normalizeEmail(i.email),
  //             role: i.role
  //           }));
  //           await this.updateExternalInvites(tx, rootId, normalizedInvites);
  //         }

  //         return roomData;
  //       });


  //       await Promise.all(
  //       result.map(room => this.chatService.getOrCreateChannelForStudyRoom(room.id, [creator.id]))
  //   );

  //   let emailDelivery;
  //   if (createDto.allowExternalUsers && roomData[0].externalPasscode && createDto.externalInvites?.length) {
  //     emailDelivery = await this.sendExternalInviteEmails(
  //       rootId,
  //       createDto.title,
  //       roomData[0].externalPasscode,
  //       createDto.externalInvites
  //     );
  //   }

  //   return {
  //     id: rootId,
  //     ...roomData[0],
  //     emailDelivery,
  //     occurrencesCreated: result.length
  //   };
  // }

  async createStudyRoom(userId: string, createDto: CreateStudyRoomDto) {
    const creator = await this.resolveUserIdentity(userId);
    const slugBase = createDto.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const uniqueHash = Math.random().toString(36).substring(2, 6);
    const seriesSlug = `${slugBase}-${uniqueHash}`;

    let occurrences;
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

    const isWebinar =
      createDto.sessionMode === StudyRoomSessionModeDto.WEBINAR;
    if (isWebinar && createDto.recurrence) {
      throw new BadRequestException({
        code: 'WEBINAR_NO_RECURRENCE',
        message: 'Webinar mode does not support recurring series.',
      });
    }
    const webinarConfigMerged = isWebinar
      ? this.mergeWebinarConfig(createDto.webinarConfig)
      : null;
    const webinarRegistrationSlug = isWebinar
      ? `w${randomBytes(6).toString('hex')}`
      : null;

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
            joiningFee: isWebinar ? 0 : createDto.joiningFee || 0,
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
            sessionMode: isWebinar
              ? StudyRoomSessionMode.WEBINAR
              : StudyRoomSessionMode.STANDARD,
            webinarConfig: webinarConfigMerged
              ? (webinarConfigMerged as Prisma.InputJsonValue)
              : undefined,
            webinarRegistrationSlug: webinarRegistrationSlug ?? undefined,
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

      return rows;
    });

    for (const room of createdRooms) {
      await this.chatService.getOrCreateChannelForStudyRoom(room.id, [creator.id]);
    }

    const firstRoom = createdRooms[0];
    await this.notifyFollowersAboutStudyRoom({
      hostId: creator.id,
      hostName: creator.name ?? null,
      roomId: firstRoom.id,
      roomTitle: createDto.title,
      startsAt: firstRoom.date,
      isLive: firstRoom.date.getTime() <= now.getTime(),
    });

    const appPublicUrl = this.resolveAppPublicBaseUrl();
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
      joiningFee: isWebinar ? 0 : createDto.joiningFee || 0,
      sessionMode: isWebinar
        ? StudyRoomSessionModeDto.WEBINAR
        : StudyRoomSessionModeDto.STANDARD,
      webinarRegistrationSlug: webinarRegistrationSlug ?? undefined,
      webinarRegistrationUrl:
        webinarRegistrationSlug && appPublicUrl
          ? `${appPublicUrl.replace(/\/$/, '')}/webinar/register/${webinarRegistrationSlug}`
          : webinarRegistrationSlug
            ? `/webinar/register/${webinarRegistrationSlug}`
            : null,
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
      occurrencesCreated: createdRooms.length,
      slug: seriesSlug,
      isRecurring: !!createDto.recurrence,
    };
  }

  async getWebinarPublicBySlug(slug: string) {
    const room = await this.prisma.studyRoom.findFirst({
      where: { webinarRegistrationSlug: slug },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        duration: true,
        sessionStatus: true,
        sessionMode: true,
        webinarConfig: true,
        createdBy: { select: { name: true } },
      },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      throw new NotFoundException('Webinar not found');
    }
    const merged = this.mergeWebinarConfig(
      (room.webinarConfig as Record<string, unknown>) || undefined,
    );
    const fields = (merged.registrationFields as unknown[]) || [];
    return {
      id: room.id,
      title: room.title,
      description: room.description,
      startsAt: room.date.toISOString(),
      duration: room.duration,
      sessionStatus: room.sessionStatus,
      hostName: room.createdBy.name,
      registrationFields: fields,
      permissions: merged.permissions ?? {},
      runtime: merged.runtime ?? { chatEnabled: true },
    };
  }

  /**
   * Resolve DB user for in-app notification: prefer JWT dbUserId / clerkId when email matches form.
   */
  private async resolveWebinarRegistrantDbUserId(
    emailNorm: string,
    opts?: { dbUserId?: string; clerkId?: string },
  ): Promise<string | null> {
    if (opts?.dbUserId) {
      const u = await this.prisma.user.findUnique({
        where: { id: opts.dbUserId },
        select: { id: true, email: true },
      });
      if (u && this.normalizeEmail(u.email) === emailNorm) return u.id;
    }
    if (opts?.clerkId) {
      const u = await this.prisma.user.findUnique({
        where: { clerkId: opts.clerkId },
        select: { id: true, email: true },
      });
      if (u && this.normalizeEmail(u.email) === emailNorm) return u.id;
    }
    const byEmail = await this.prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true },
    });
    return byEmail?.id ?? null;
  }

  async registerForWebinar(
    slug: string,
    dto: RegisterWebinarDto,
    auth?: { dbUserId?: string; clerkId?: string },
  ) {
    const room = await this.prisma.studyRoom.findFirst({
      where: { webinarRegistrationSlug: slug },
      include: { createdBy: { select: { name: true } } },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      throw new NotFoundException('Webinar not found');
    }
    if (
      room.sessionStatus === SessionStatus.DONE ||
      room.sessionStatus === SessionStatus.CANCELLED ||
      room.sessionStatus === SessionStatus.NOT_COMPLETED
    ) {
      throw new BadRequestException({
        code: 'WEBINAR_CLOSED',
        message: 'This webinar is no longer open for registration.',
      });
    }
    const cfg = this.mergeWebinarConfig(
      (room.webinarConfig as Record<string, unknown>) || undefined,
    );
    const runtimeCfg = (cfg.runtime as Record<string, unknown>) || {};
    const waitingRoomEnabled = runtimeCfg.waitingRoomEnabled !== false;
    const fields =
      (cfg.registrationFields as Array<{
        id: string;
        label: string;
        required?: boolean;
      }>) || [];
    const emailNorm = this.normalizeEmail(dto.email);
    if (!dto.name?.trim()) {
      throw new BadRequestException({ message: 'Name is required' });
    }
    for (const f of fields) {
      if (f.id === 'email' || f.id === 'name') continue;
      const v = dto.responses?.[f.id];
      if (f.required && (!v || String(v).trim() === '')) {
        throw new BadRequestException({
          code: 'FIELD_REQUIRED',
          message: `Please fill in: ${f.label}`,
        });
      }
    }

    let existing: Awaited<
      ReturnType<typeof this.prisma.webinarRegistration.findUnique>
    >;
    try {
      existing = await this.prisma.webinarRegistration.findUnique({
        where: {
          studyRoomId_email: { studyRoomId: room.id, email: emailNorm },
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2022'
      ) {
        throw new InternalServerErrorException({
          code: 'DB_SCHEMA_MISMATCH',
          message:
            'Database is missing required columns. Run: npx prisma migrate deploy',
        });
      }
      throw e;
    }
    if (existing) {
      let linkToken = existing.joinLinkToken;
      if (!linkToken) {
        linkToken = this.generateJoinLinkToken();
        try {
          await this.prisma.webinarRegistration.update({
            where: { id: existing.id },
            data: { joinLinkToken: linkToken },
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2022'
          ) {
            throw new InternalServerErrorException({
              code: 'DB_SCHEMA_MISMATCH',
              message:
                'Database is missing required columns. Run: npx prisma migrate deploy',
            });
          }
          throw e;
        }
      }
      if (!waitingRoomEnabled) {
        const guestDup = await this.prisma.studyRoomGuestParticipant.findUnique({
          where: {
            studyRoomId_email: { studyRoomId: room.id, email: emailNorm },
          },
          select: { id: true, approvedBy: true },
        });
        if (guestDup && !guestDup.approvedBy) {
          await this.prisma.studyRoomGuestParticipant.update({
            where: { id: guestDup.id },
            data: { approvedBy: room.createdById },
          });
        }
      }
      const joinUrlManualDup = this.buildWebinarJoinUrl(room.id, linkToken);
      return {
        success: true,
        alreadyRegistered: true,
        approvalPending: waitingRoomEnabled,
        joinUrlManual: joinUrlManualDup,
        roomId: room.id,
        title: room.title,
        message:
          'Check your email for the Join webinar link and your passcode.',
      };
    }

    const counts =
      (await this.prisma.studyRoomParticipant.count({
        where: { studyRoomId: room.id },
      })) +
      (await this.prisma.studyRoomGuestParticipant.count({
        where: { studyRoomId: room.id },
      }));
    if (counts >= room.maxParticipants) {
      throw new BadRequestException({
        code: 'WEBINAR_FULL',
        message: 'This webinar is full.',
      });
    }

    await this.prisma.studyRoomGuestParticipant.upsert({
      where: {
        studyRoomId_email: { studyRoomId: room.id, email: emailNorm },
      },
      update: {
        name: dto.name.trim(),
        approvedBy: waitingRoomEnabled ? null : room.createdById,
      },
      create: {
        studyRoomId: room.id,
        name: dto.name.trim(),
        email: emailNorm,
        role: StudyRoomParticipantRole.PARTICIPANT,
        livekitIdentity: `guest-${randomUUID()}`,
        approvedBy: waitingRoomEnabled ? null : room.createdById,
      },
    });

    const joinPasscode = this.generatePasscode();
    const joinLinkToken = this.generateJoinLinkToken();

    try {
      await this.prisma.webinarRegistration.create({
        data: {
          studyRoomId: room.id,
          email: emailNorm,
          name: dto.name.trim(),
          joinPasscode,
          joinLinkToken,
          ...(dto.responses
            ? { responses: dto.responses as Prisma.InputJsonValue }
            : {}),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2022'
      ) {
        throw new InternalServerErrorException({
          code: 'DB_SCHEMA_MISMATCH',
          message:
            'Database is missing required columns. Run: npx prisma migrate deploy',
        });
      }
      throw e;
    }

    const joinUrlManual = this.buildWebinarJoinUrl(room.id, joinLinkToken);
    const waitingUrlManual = this.buildWebinarWaitingUrl(room.id, joinLinkToken);

    const hostName = room.createdBy?.name?.trim() || 'Host';
    const tz = room.timezone?.trim() || 'UTC';

    let emailResult: EmailDeliveryResult = {
      success: false,
      errorMessage: 'Email send did not complete',
    };
    try {
      emailResult =
        await this.emailService.sendWebinarRegistrationConfirmationEmail({
          recipientEmail: emailNorm,
          recipientName: dto.name.trim(),
          webinarTitle: room.title,
          webinarDescription: room.description,
          scheduledAt: room.date,
          durationMinutes: room.duration,
          timezone: tz,
          hostName,
          joinPageUrl: joinUrlManual,
          waitingPageUrl: waitingUrlManual,
          passcode: joinPasscode,
        });
    } catch (emailErr) {
      this.logger.error({
        message:
          'Webinar confirmation email threw — registration was saved; user can retry or contact host',
        studyRoomId: room.id,
        recipientEmail: emailNorm,
        error:
          emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }
    if (!emailResult.success) {
      this.logger.error({
        message:
          'Webinar registration confirmation email failed — AWS SES did not accept the send. Fix: verify SES_FROM_EMAIL in SES, use the same region as AWS_SES_REGION, ensure IAM allows ses:SendEmail, and in SES sandbox verify BOTH the sender identity and the recipient email in the SES console.',
        recipientEmail: emailNorm,
        studyRoomId: room.id,
        errorCode: emailResult.errorCode,
        errorMessage: emailResult.errorMessage,
      });
    }

    if (waitingRoomEnabled) {
      try {
        await this.notificationsService.createAndPushNotification(
          room.createdById,
          `${dto.name.trim()} registered for "${room.title}" and is waiting for approval. Open the webinar to admit them from the panel.`,
          'Webinar: attendee waiting',
          NotifType.NORMAL,
          {
            actionType: 'WEBINAR_REGISTRATION_PENDING',
            studyRoomId: room.id,
          },
        );
      } catch (hostNotifErr) {
        this.logger.warn({
          message: 'Host notification failed (registration still saved)',
          studyRoomId: room.id,
          error:
            hostNotifErr instanceof Error
              ? hostNotifErr.message
              : String(hostNotifErr),
        });
      }
    }

    const registrantUserId = await this.resolveWebinarRegistrantDbUserId(
      emailNorm,
      auth,
    );
    if (registrantUserId) {
      try {
        const regMsg = `Webinar: check your email for the Join webinar link and passcode. (${room.title})`;
        await this.notificationsService.createAndPushNotification(
          registrantUserId,
          regMsg,
          'Webinar registration',
          NotifType.NORMAL,
          {
            actionType: 'WEBINAR_REGISTERED',
            studyRoomId: room.id,
            actionData: {
              sessionType: 'webinar',
              studyRoomId: room.id,
              joinUrlManual,
            },
          },
        );
      } catch (notifErr) {
        this.logger.warn({
          message: 'Webinar in-app notification failed (registration still saved)',
          studyRoomId: room.id,
          userId: registrantUserId,
          error:
            notifErr instanceof Error ? notifErr.message : String(notifErr),
        });
      }
    }

    return {
      success: true,
      approvalPending: waitingRoomEnabled,
      emailSent: emailResult.success,
      joinUrlManual,
      roomId: room.id,
      title: room.title,
      message: emailResult.success
        ? 'Check your email for the Join webinar link and your passcode.'
        : 'Registration saved. Confirmation email could not be sent—contact the host if needed.',
      ...(emailResult.debugEmailPreview
        ? { debugEmailPreview: emailResult.debugEmailPreview }
        : {}),
    };
  }

  /** Webinar audience: subscribe-only; host publishes A/V (unless permissions allow mic/video). */
  async getLivekitPublishPolicyForStudyRoom(
    studyRoomId: string,
    clerkUserId: string,
  ): Promise<{ publish: boolean; publishData: boolean }> {
    const room = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
      select: {
        sessionMode: true,
        createdById: true,
        webinarConfig: true,
      },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      return { publish: true, publishData: true };
    }
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (user?.id === room.createdById) {
      return { publish: true, publishData: true };
    }
    const cfg = this.mergeWebinarConfig(
      (room.webinarConfig as Record<string, unknown>) || undefined,
    );
    // LiveKit canPublish must be true for guests to start camera/mic tracks when the host
    // unlocks or requests media; webinar defaults are enforced in UI and moderation, not here.
    const publish = true;
    const { publishData } = this.webinarChatPublishData(
      cfg as Record<string, unknown>,
    );
    return { publish, publishData };
  }

  private webinarChatPublishData(cfg: Record<string, unknown>): {
    publishData: boolean;
  } {
    const perms = (cfg.permissions as Record<string, string>) || {};
    const chatPerm = perms.chat || 'host_only';
    const runtime = (cfg.runtime as Record<string, unknown>) || {};
    const chatLive = runtime.chatEnabled !== false;
    if (chatPerm === 'disabled' || !chatLive) {
      return { publishData: false };
    }
    return { publishData: true };
  }

  /** LiveKit grants for webinar guest participants (after token validation). */
  async getLivekitPublishPolicyForWebinarGuest(
    studyRoomId: string,
    guestParticipantId: string,
  ): Promise<{ publish: boolean; publishData: boolean }> {
    const room = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
      select: {
        sessionMode: true,
        webinarConfig: true,
      },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      return { publish: false, publishData: true };
    }
    const guest = await this.prisma.studyRoomGuestParticipant.findUnique({
      where: { id: guestParticipantId },
    });
    if (!guest || guest.studyRoomId !== studyRoomId) {
      return { publish: false, publishData: true };
    }
    if (guest.role === StudyRoomParticipantRole.COHOST) {
      return { publish: true, publishData: true };
    }
    const cfg = this.mergeWebinarConfig(
      (room.webinarConfig as Record<string, unknown>) || undefined,
    );
    // Same as getLivekitPublishPolicyForStudyRoom for webinar non-hosts: token must allow
    // publishing when host requests camera/mic; room rules stay in app layer.
    const publish = true;
    const { publishData } = this.webinarChatPublishData(
      cfg as Record<string, unknown>,
    );
    return { publish, publishData };
  }

  async joinWebinarWithPasscode(dto: {
    studyRoomId: string;
    passcode: string;
    joinToken: string;
  }) {
    const room = await this.prisma.studyRoom.findUnique({
      where: { id: dto.studyRoomId },
      select: {
        id: true,
        sessionMode: true,
        sessionStatus: true,
        webinarConfig: true,
      },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      throw new NotFoundException('Webinar not found');
    }
    if (
      room.sessionStatus === SessionStatus.DONE ||
      room.sessionStatus === SessionStatus.CANCELLED ||
      room.sessionStatus === SessionStatus.NOT_COMPLETED
    ) {
      throw new BadRequestException({
        code: 'WEBINAR_CLOSED',
        message: 'This webinar is no longer available.',
      });
    }
    const joinCfg = this.mergeWebinarConfig(
      (room.webinarConfig as Record<string, unknown>) || undefined,
    );
    const joinRuntime =
      (joinCfg.runtime as Record<string, unknown>) || {};
    const joinWaitingRoomEnabled = joinRuntime.waitingRoomEnabled !== false;
    const tokenTrim = dto.joinToken.trim();
    const reg = await this.prisma.webinarRegistration.findUnique({
      where: { joinLinkToken: tokenTrim },
    });
    if (!reg || reg.studyRoomId !== room.id) {
      throw new BadRequestException({
        code: 'WEBINAR_JOIN_INVALID',
        message:
          'Invalid or incomplete join link. Open the full link from your registration email.',
      });
    }
    const emailNorm = this.normalizeEmail(reg.email);
    const guest = await this.prisma.studyRoomGuestParticipant.findUnique({
      where: {
        studyRoomId_email: { studyRoomId: room.id, email: emailNorm },
      },
    });
    if (!guest) {
      throw new BadRequestException({
        code: 'WEBINAR_JOIN_INVALID',
        message:
          'Registration could not be found for this webinar. Contact the host if this persists.',
      });
    }
    const passTrim = dto.passcode.trim();
    /** After host approval with waiting room on, join from waiting page with token only (no passcode re-entry). */
    const approvedWaitingRoom =
      joinWaitingRoomEnabled && !!guest.approvedBy;
    if (!approvedWaitingRoom) {
      if ((reg.joinPasscode || '').trim() !== passTrim) {
        throw new BadRequestException({
          code: 'WEBINAR_JOIN_INVALID',
          message:
            'Invalid passcode. Use the code from your confirmation email.',
        });
      }
    }
    if (!guest.approvedBy && joinWaitingRoomEnabled) {
      throw new BadRequestException({
        code: 'WEBINAR_PENDING_APPROVAL',
        message:
          'The host has not approved your registration yet. Try again after the host admits you.',
      });
    }
    const guestAccessToken = await this.issueGuestAccessToken(
      room.id,
      guest.id,
    );
    const appPublicUrl = this.resolveAppPublicBaseUrl().replace(/\/$/, '');
    const joinPath = `/rooms/studyroom/studyroom-${room.id}?guestAccessToken=${guestAccessToken}`;
    const joinUrl = `${appPublicUrl}${joinPath}`;
    return {
      success: true,
      guestAccessToken,
      joinUrl,
      roomId: room.id,
    };
  }

  /**
   * Public poll for the waiting room: same join link token as in the email.
   * `canJoin` is true when waiting room is off (auto-admit) or host has approved the guest.
   */
  async getWebinarRegistrationApprovalStatus(
    studyRoomId: string,
    joinLinkToken: string,
  ): Promise<{ waitingRoomEnabled: boolean; canJoin: boolean }> {
    const idTrim = studyRoomId?.trim();
    const tokenTrim = joinLinkToken?.trim();
    if (!idTrim || !tokenTrim) {
      throw new BadRequestException('room and token are required');
    }
    const room = await this.resolveStudyRoomByIdOrSlug(idTrim, {
      select: { id: true, sessionMode: true, webinarConfig: true },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      throw new NotFoundException('Webinar not found');
    }
    const joinCfg = this.mergeWebinarConfig(
      (room.webinarConfig as Record<string, unknown>) || undefined,
    );
    const joinRuntime =
      (joinCfg.runtime as Record<string, unknown>) || {};
    const waitingRoomEnabled = joinRuntime.waitingRoomEnabled !== false;

    const reg = await this.prisma.webinarRegistration.findUnique({
      where: { joinLinkToken: tokenTrim },
    });
    if (!reg || reg.studyRoomId !== room.id) {
      throw new NotFoundException('Registration not found');
    }
    const emailNorm = this.normalizeEmail(reg.email);
    const guest = await this.prisma.studyRoomGuestParticipant.findUnique({
      where: {
        studyRoomId_email: { studyRoomId: room.id, email: emailNorm },
      },
      select: { approvedBy: true },
    });
    if (!guest) {
      return { waitingRoomEnabled, canJoin: false };
    }
    const canJoin = !waitingRoomEnabled || !!guest.approvedBy;
    return { waitingRoomEnabled, canJoin };
  }

  async listWebinarRegistrations(studyRoomId: string, hostUserId: string) {
    const room = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: {
        id: true,
        createdById: true,
        sessionMode: true,
        webinarConfig: true,
      },
    });
    if (
      !room ||
      room.sessionMode !== StudyRoomSessionMode.WEBINAR
    ) {
      throw new NotFoundException('Webinar not found');
    }
    const actor = await this.resolveUserIdentity(hostUserId);
    if (room.createdById !== actor.id) {
      throw new ForbiddenException('Only the host can view registrations');
    }
    const listCfg = this.mergeWebinarConfig(
      (room.webinarConfig as Record<string, unknown>) || undefined,
    );
    const listRuntime =
      (listCfg.runtime as Record<string, unknown>) || {};
    const waitingRoomEnabled = listRuntime.waitingRoomEnabled !== false;

    const rows = await this.prisma.webinarRegistration.findMany({
      where: { studyRoomId: room.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        responses: true,
      },
    });
    const guests = await this.prisma.studyRoomGuestParticipant.findMany({
      where: { studyRoomId: room.id },
      select: { id: true, email: true, approvedBy: true },
    });
    const guestByEmail = new Map(
      guests.map((g) => [this.normalizeEmail(g.email), g]),
    );
    return {
      waitingRoomEnabled,
      registrations: rows.map((r) => {
        const g = guestByEmail.get(this.normalizeEmail(r.email));
        return {
          ...r,
          guestParticipantId: g?.id ?? null,
          approvalStatus: g?.approvedBy ? ('approved' as const) : ('pending' as const),
        };
      }),
    };
  }

  async approveWebinarRegistration(
    studyRoomId: string,
    registrationId: string,
    hostUserId: string,
  ) {
    const room = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: { id: true, createdById: true, sessionMode: true, title: true },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      throw new NotFoundException('Webinar not found');
    }
    const actor = await this.resolveUserIdentity(hostUserId);
    if (room.createdById !== actor.id) {
      throw new ForbiddenException('Only the host can approve registrations');
    }
    const reg = await this.prisma.webinarRegistration.findFirst({
      where: { id: registrationId, studyRoomId: room.id },
    });
    if (!reg) {
      throw new NotFoundException('Registration not found');
    }
    const emailNorm = this.normalizeEmail(reg.email);
    const guest = await this.prisma.studyRoomGuestParticipant.findUnique({
      where: {
        studyRoomId_email: { studyRoomId: room.id, email: emailNorm },
      },
    });
    if (!guest) {
      throw new NotFoundException('Guest record not found');
    }
    if (guest.approvedBy) {
      return { success: true, alreadyApproved: true as const };
    }
    await this.prisma.studyRoomGuestParticipant.update({
      where: { id: guest.id },
      data: { approvedBy: room.createdById },
    });

    // Single-email policy: confirmation at registration includes join link + passcode.
    // No second email on approval—attendees retry join / waiting room after the host admits them.

    return {
      success: true,
      alreadyApproved: false as const,
    };
  }

  async removeWebinarGuest(
    studyRoomId: string,
    guestParticipantId: string,
    hostUserId: string,
  ) {
    const room = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: { id: true, createdById: true, sessionMode: true },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      throw new NotFoundException('Webinar not found');
    }
    const actor = await this.resolveUserIdentity(hostUserId);
    if (room.createdById !== actor.id) {
      throw new ForbiddenException('Only the host can remove attendees');
    }
    const guest = await this.prisma.studyRoomGuestParticipant.findFirst({
      where: { id: guestParticipantId, studyRoomId: room.id },
    });
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }
    await this.prisma.webinarRegistration.deleteMany({
      where: { studyRoomId: room.id, email: guest.email },
    });
    await this.prisma.studyRoomGuestParticipant.delete({
      where: { id: guest.id },
    });
    return { success: true };
  }

  async setWebinarChatEnabled(
    studyRoomId: string,
    clerkUserId: string,
    enabled: boolean,
  ) {
    const room = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
      select: { id: true, createdById: true, sessionMode: true, webinarConfig: true },
    });
    if (!room || room.sessionMode !== StudyRoomSessionMode.WEBINAR) {
      throw new NotFoundException('Webinar not found');
    }
    const actor = await this.resolveUserIdentity(clerkUserId);
    if (room.createdById !== actor.id) {
      throw new ForbiddenException('Only the host can change chat');
    }
    const prev = (room.webinarConfig as Record<string, unknown>) || {};
    const merged = this.mergeWebinarConfig(prev);
    const next = {
      ...merged,
      runtime: {
        ...(merged.runtime as Record<string, unknown>),
        chatEnabled: enabled,
      },
    };
    await this.prisma.studyRoom.update({
      where: { id: room.id },
      data: { webinarConfig: next as Prisma.InputJsonValue },
    });
    return { success: true, chatEnabled: enabled };
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

    const updateData: Record<string, unknown> = {};
    if (updateDto.title !== undefined && updateDto.title.trim() !== "") {
      updateData.title = updateDto.title.trim();
    }
    if (updateDto.description !== undefined) {
      const d =
        typeof updateDto.description === "string"
          ? updateDto.description.trim()
          : updateDto.description;
      updateData.description = d === "" ? null : d;
    }
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
      hasNonStatusChange || updateDto.skills !== undefined;
    if (shouldMarkHostDetailsEdited) {
      updateData.hostDetailsUpdatedAt = new Date();
    }

    const whereForScope =
      editScope === StudyRoomEditScope.SINGLE || !studyRoom.seriesId
        ? { id: studyRoom.id }
        : editScope === StudyRoomEditScope.THIS_AND_FUTURE
          ? { seriesId: studyRoom.seriesId, date: { gte: studyRoom.date } }
          : { seriesId: studyRoom.seriesId };

    const targetRooms = await this.prisma.studyRoom.findMany({
      where: whereForScope as never,
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
                ...(updateData as object),
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
                ...(updateData as object),
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
      where: whereForScope as never,
      data: updateData as never,
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

  async createRecurringRoom(userId: string, createDto: CreateStudyRoomDto) {
    const creator = await this.resolveUserIdentity(userId);

    const slugBase = createDto.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const uniqueHash = Math.random().toString(36).substring(2, 6);
    const seriesSlug = `${slugBase}-${uniqueHash}`;

    let occurrences;
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

    const skillIds = skills.map((s) => s.id);

    const seriesId = randomUUID();

    const recurrenceEndDate = createDto.recurrence
      ? convertLocalToUTC(
        createDto.recurrence.repeatUntil,
        createDto.time,
        createDto.timezone,
      )
      : null;


    const studyRoomData = occurrences.map((occurrence) => {
      const sessionStatus =
        occurrence.utcDate.getTime() <= now.getTime()
          ? SessionStatus.ONGOING
          : SessionStatus.UPCOMING;

      return {
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
        isRecurring: true,
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
      };
    });

    let createdRooms;

    try {
      createdRooms = await this.prisma.$transaction(async (tx) => {
        await tx.studyRoom.createMany({ data: studyRoomData });

        const rooms = await tx.studyRoom.findMany({
          where: { seriesId },
          select: { id: true, occurrenceIndex: true, date: true },
          orderBy: { occurrenceIndex: 'asc' },
        });


        if (skillIds.length > 0) {
          const skillMappings = rooms.flatMap((room) =>
            skillIds.map((skillId) => ({
              studyRoomId: room.id,
              skillId,
            })),
          );

          await tx.studyRoomSkill.createMany({
            data: skillMappings,
          });
        }
        return rooms;
      }, {
        timeout: 10000
      });
    } catch (err) {
      console.log(err);

      await this.prisma.studyRoom.deleteMany({
        where: { seriesId },
      });
      throw err;
    }


    setImmediate(async () => {
      for (const room of createdRooms) {
        await this.chatService.getOrCreateChannelForStudyRoom(room.id, [creator.id]);
      }
    });


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
      occurrencesCreated: createdRooms.length,
      slug: seriesSlug,
      isRecurring: true,
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

    const actor = await this.resolveUserIdentity(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, coins: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentRoom = await this.prisma.studyRoom.findUnique({
      where: { id: studyRoomId },
      select: { seriesId: true, date: true },
    });

    if (!currentRoom?.seriesId) {
      return this.joinStudyRoom(studyRoomId, userId);
    }

    const rooms = await this.prisma.studyRoom.findMany({
      where: {
        seriesId: currentRoom.seriesId,
        date: { gte: currentRoom.date },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        joiningFee: true,
        createdById: true,
        maxParticipants: true,
        title: true,
        _count: {
          select: {
            learners: true,
            guestParticipants: true,
          },
        },
      },
    });

    if (rooms.length === 0) {
      return { success: true, message: 'No sessions found' };
    }

    if (rooms[0].createdById === user.id) {
      return {
        success: true,
        message: 'You are the teacher of this study room',
      };
    }

    const fullRoom = rooms.find(
      (r) =>
        r._count.learners + r._count.guestParticipants >= r.maxParticipants
    );

    if (fullRoom) {
      throw new BadRequestException({
        code: 'ROOM_FULL',
        message: 'One or more sessions are full',
      });
    }

    const totalCost = rooms.reduce(
      (sum, r) => sum + Number(r.joiningFee),
      0
    );

    if (Number(user.coins) < totalCost) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_COINS',
        message: `You need ${totalCost} Coins`,
      });
    }

    const roomIds = rooms.map((r) => r.id);

    await this.prisma.$transaction(async (tx) => {
      //  deduct fees
      await tx.user.update({
        where: { id: user.id },
        data: {
          coins: {
            decrement: totalCost,
          },
        },
      });

      //do  payments
      await tx.payment.createMany({
        data: rooms.map((r) => ({
          paymentStatus: PaymentStatus.ESCROW,
          madeById: user.id,
          receivedById: r.createdById,
          studyRoomId: r.id,
          amountMade: r.joiningFee,
          amountReceived: r.joiningFee,
        })),
      });

      // ad participants
      await tx.studyRoomParticipant.createMany({
        data: roomIds.map((roomId) => ({
          userId: user.id,
          studyRoomId: roomId,
          role: StudyRoomParticipantRole.PARTICIPANT,
        })),
        skipDuplicates: true,
      });
    });

    setImmediate(async () => {
      for (const room of rooms) {
        const participants = await this.prisma.studyRoomParticipant.findMany({
          where: { studyRoomId: room.id },
          select: { userId: true },
        });

        const ids = [
          room.createdById,
          ...participants.map((p) => p.userId),
        ];

        await this.chatService.getOrCreateChannelForStudyRoom(room.id, ids);
      }

      await this.notificationsService.createAndPushNotification(
        rooms[0].createdById,
        `${user.name} joined ${rooms.length} sessions in your series "${rooms[0].title}`,
        'New Participant',
        NotifType.NORMAL,
        {
          actionType: 'STUDYROOM_JOINED',
          studyRoomId: rooms[0].id,
        },
      );
    });

    return {
      success: true,
      message: `Joined ${rooms.length} sessions in the series`,
    };
  }


  async unenroll(userId: string, targetId: string, scope: "THIS" | "ALL" | "FOLLOWING") {

    const actor = await this.resolveUserIdentity(userId);
    userId = actor.id

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

  async updateParticipantRole(
    studyRoomId: string,
    userId: string,
    participantIdentity: string,
    role: StudyRoomParticipantRoleDto,
  ) {

    const actor = await this.resolveUserIdentity(userId);
    userId = actor.id

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
        studyRoom: { select: { id: true, sessionMode: true } },
      },
    });
    if (!token || token.studyRoomId !== studyRoom.id) {
      throw new ForbiddenException('Invalid guest access token');
    }
    if (token.expiresAt < new Date()) {
      throw new ForbiddenException('Guest access token expired');
    }
    const tokenStudyRoom = token.studyRoom as {
      id: string;
      sessionMode: StudyRoomSessionMode;
    };
    if (
      tokenStudyRoom.sessionMode === StudyRoomSessionMode.WEBINAR &&
      !token.guestParticipant.approvedBy
    ) {
      throw new ForbiddenException(
        'The host has not approved your registration yet. You cannot join until admitted.',
      );
    }
    return token;
  }

  async cancelStudyRoom(
    studyRoomId: string,
    userId: string,
    editScope: StudyRoomEditScope = StudyRoomEditScope.SINGLE,
  ) {

    const actor = await this.resolveUserIdentity(userId);
    userId = actor.id

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

    const whereForScope =
      editScope === StudyRoomEditScope.SINGLE || !studyRoom.seriesId
        ? { id: studyRoom.id }
        : editScope === StudyRoomEditScope.THIS_AND_FUTURE
          ? { seriesId: studyRoom.seriesId, date: { gte: studyRoom.date } }
          : { seriesId: studyRoom.seriesId };

    const result = await this.prisma.studyRoom.updateMany({
      where: {
        ...(whereForScope as object),
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

    const actor = await this.resolveUserIdentity(userId);
    userId = actor.id

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

    // Background the rest of the post-session processing
    (async () => {
      try {
        this.logger.debug(`🚀 [completeStudyRoom] Starting background post-session processing for ${studyRoomId}`);
        
        // Get all participants for streak tracking
        const participants = await this.prisma.studyRoomParticipant.findMany({
          where: { studyRoomId: studyRoom.id },
          select: { userId: true },
        });

        this.logger.debug(
          `👥 [completeStudyRoom] Found ${participants.length} participants to process`,
        );

        // 1. Process creator updates (host/teacher)
        this.logger.debug('🔥 [completeStudyRoom] Background: Updating creator data');
        await Promise.all([
          this.streaksService.updateUserActivity(
            studyRoom.createdById,
            studyRoom.date,
            studyRoom.duration,
            'teacher',
            0,
          ),
          this.achievementsService.checkSessionAchievements(
            studyRoom.createdById,
            'teacher',
          ),
          this.engagementService.awardFirstMeaningfulActionBonus(
            studyRoom.createdById,
            studyRoom.date,
            'session_completion',
          ),
          this.engagementService.awardFirstTeachingSessionOfWeekBonus(
            studyRoom.createdById,
            studyRoom.date,
          ),
        ]).catch(err => this.logger.error('Error in background creator updates:', err));

        const creatorStreak = await this.streaksService.getUserStreak(studyRoom.createdById);
        await this.achievementsService.checkStreakAchievements(
          studyRoom.createdById,
          creatorStreak.currentStreak,
        ).catch(err => this.logger.error('Error in background creator streak achievements:', err));

        // 2. Process participant updates (learners) in chunks to avoid overwhelming the DB
        this.logger.debug('🚀 [completeStudyRoom] Background: Updating participant data in chunks');
        const CHUNK_SIZE = 5;
        for (let i = 0; i < participants.length; i += CHUNK_SIZE) {
          const chunk = participants.slice(i, i + CHUNK_SIZE);
          this.logger.debug(`📦 [completeStudyRoom] Background: Processing participant chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(participants.length/CHUNK_SIZE)}`);
          
          await Promise.all(chunk.map(async (participant) => {
            try {
              await this.streaksService.updateUserActivity(
                participant.userId,
                studyRoom.date,
                studyRoom.duration,
                'learner',
                0,
              );
              await Promise.all([
                this.achievementsService.checkSessionAchievements(participant.userId, 'learner'),
                this.engagementService.awardFirstMeaningfulActionBonus(participant.userId, studyRoom.date, 'session_completion'),
              ]);
              const pStreak = await this.streaksService.getUserStreak(participant.userId);
              await this.achievementsService.checkStreakAchievements(participant.userId, pStreak.currentStreak);
            } catch (err) {
              this.logger.error(`[completeStudyRoom] Background: Participant update failed for ${participant.userId}:`, err);
            }
          }));
        }

        // 3. Generate AI summary
        this.logger.debug('🤖 [completeStudyRoom] Background: Starting AI summary generation');
        const summary = await this.transcriptsService.compileAndSummarize(studyRoom.id);
        if (summary) {
          await this.prisma.studyRoom.update({
            where: { id: studyRoom.id },
            data: { summary },
          });
          this.logger.log('✅ [completeStudyRoom] Background: AI summary stored successfully');
        }
        
        this.logger.debug(`✅ [completeStudyRoom] Background processing completed for ${studyRoomId}`);
      } catch (error) {
        this.logger.error(`❌ [completeStudyRoom] Fatal error in background processing for ${studyRoomId}:`, error);
      }
    })();

    return {
      success: true,
      message: 'Study room marked as completed. Processing data in background.',
      studyRoom: updatedRoom,
    };
  }

  async checkIsHost(
    studyRoomId: string,
    dbUserId: string | undefined,
    clerkUserId: string | undefined,
  ) {
    let resolvedDbUserId = dbUserId;

    if (!resolvedDbUserId && clerkUserId) {
      const studyRoomEarly = await this.resolveStudyRoomByIdOrSlug(studyRoomId, {
        select: { id: true, createdById: true },
      });
      if (!studyRoomEarly) {
        throw new NotFoundException('Study room not found');
      }
      // Session moderation socket uses LiveKit identity for guests (not Clerk ids)
      const guestHit = await this.prisma.studyRoomGuestParticipant.findFirst({
        where: { studyRoomId: studyRoomEarly.id, livekitIdentity: clerkUserId },
        select: { role: true },
      });
      if (guestHit) {
        return {
          isHost: guestHit.role === StudyRoomParticipantRole.COHOST,
        };
      }

      const ensured = await this.usersService.ensureUserFromClerk(clerkUserId);
      resolvedDbUserId = ensured.id;
    }
    if (!resolvedDbUserId) {
      throw new UnauthorizedException('User identity required');
    }

    const [studyRoom, user] = await Promise.all([
      this.resolveStudyRoomByIdOrSlug(studyRoomId, {
        select: { id: true, createdById: true },
      }),
      this.prisma.user.findUnique({
        where: { id: resolvedDbUserId },
        select: { id: true },
      }),
    ]);

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    const guestParticipant = await this.prisma.studyRoomGuestParticipant.findFirst({
      where: { studyRoomId: studyRoom.id, livekitIdentity: resolvedDbUserId },
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

    const actor = await this.resolveUserIdentity(userId);
    userId = actor.id

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
    if (studyRoom.createdById !== userId) {
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

    const actor = await this.resolveUserIdentity(userId);
    userId = actor.id

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
    const isHost = studyRoom.createdById === userId;
    const isParticipant = studyRoom.learners.some((l) => l.userId === userId);

    if (!isHost && !isParticipant) {
      throw new ForbiddenException(
        'You are not authorized to submit feedback for this study room',
      );
    }

    // Check if user has already submitted feedback for this session
    const existingFeedback = await this.prisma.sessionFeedback.findFirst({
      where: {
        userId: userId,
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
          userId: userId,
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
