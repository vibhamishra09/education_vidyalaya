import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionStatus, StudyRoomSessionMode } from '../generated/prisma/client';
import { CacheService } from '../redis/cache.service';
import { LoggerService } from '../common/logger';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class BrowseService {
  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(BrowseService.name);
  }

  private async resolveDbUserId(userIdOrClerkId: string): Promise<string | null> {
    const userById = await this.prisma.user.findUnique({
      where: { id: userIdOrClerkId },
      select: { id: true },
    });

    if (userById) {
      return userById.id;
    }

    const userByClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userIdOrClerkId },
      select: { id: true },
    });

    return userByClerkId?.id ?? null;
  }

  /**
   * Get personalized recommendations for a user based on their "want to learn" skills.
   * Returns peers who can teach those skills and study rooms covering those topics.
   */
  async getRecommendations(userId: string, limit: number = 8) {
    try {
      const dbUserId = await this.resolveDbUserId(userId);
      if (!dbUserId) {
        return {
          peers: [],
          studyRooms: [],
          basedOnSkills: [],
        };
      }

      // First, get the user's "want to learn" skills
      const userSkills = await this.prisma.userSkill.findMany({
        where: {
          userId,
          type: 'WANTS',
        },
        include: {
          skill: true,
        },
      });

      const wantedSkillNames = userSkills.map((us) => us.skill.name);

      if (wantedSkillNames.length === 0) {
        return {
          peers: [],
          studyRooms: [],
          basedOnSkills: [],
        };
      }

      // Find peers who have skills that the user wants to learn
      const recommendedPeers = await this.prisma.user.findMany({
        where: {
          id: { not: userId }, // Exclude self
          userSkills: {
            some: {
              type: 'HAS',
              skill: { name: { in: wantedSkillNames } },
            },
          },
        },
        take: limit,
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
          socialLinks: true,
          userSkills: {
            where: { type: 'HAS' },
            include: { skill: { select: { name: true } } },
          },
          reviewsReceived: {
            select: { rating: true },
          },
          _count: {
            select: {
              peerSessionsRequested: {
                where: { sessionStatus: SessionStatus.DONE },
              },
              peerSessionsReceived: {
                where: { sessionStatus: SessionStatus.DONE },
              },
            },
          },
        },
        orderBy: [
          // Prioritize users with better ratings
          { reviewsReceived: { _count: 'desc' } },
        ],
      });

      // Find upcoming and ongoing study rooms that match user's wanted skills
      const recommendedStudyRooms = await this.prisma.studyRoom.findMany({
        where: {
          sessionStatus: {
            in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
          },
          createdBy: { id: { not: userId } }, // Exclude own rooms
          skills: {
            some: {
              skill: { name: { in: wantedSkillNames } },
            },
          },
        },
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
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
                select: { name: true },
              },
            },
          },
          learners: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      });

      return {
        peers: recommendedPeers.map((user) => {
          const reviews = user.reviewsReceived;
          const avgRating =
            reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : null;
          const totalSessions =
            user._count.peerSessionsRequested +
            user._count.peerSessionsReceived;

          // Calculate relevance score based on matching skills
          const userSkillNames = user.userSkills.map((us) => us.skill.name);
          const matchingSkills = userSkillNames.filter((skill) =>
            wantedSkillNames.includes(skill),
          );

          return {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            bio: user.bio,
            skills: userSkillNames,
            matchingSkills,
            rating: avgRating,
            reviewCount: reviews.length,
            totalSessions,
            socialLinks: (user.socialLinks as unknown[]) || [],
          };
        }),
        studyRooms: recommendedStudyRooms.map((room) => {
          const hostReviews = room.createdBy.reviewsReceived;
          const hostAvgRating =
            hostReviews.length > 0
              ? hostReviews.reduce((sum, r) => sum + r.rating, 0) /
                hostReviews.length
              : null;
          const hostTotalSessions =
            room.createdBy._count.studyRooms +
            room.createdBy._count.peerSessionsReceived;

          const roomSkills = room.skills.map((s) => s.skill.name);
          const matchingSkills = roomSkills.filter((skill) =>
            wantedSkillNames.includes(skill),
          );

          return {
            id: room.id,
            title: room.title,
            description: room.description,
            sessionStatus: room.sessionStatus,
            date: room.date,
            duration: room.duration,
            maxParticipants: room.maxParticipants,
            joiningFee: room.joiningFee,
            participantCount: room.learners.length,
            createdBy: {
              id: room.createdBy.id,
              name: room.createdBy.name,
              avatar: room.createdBy.avatar,
            },
            skills: roomSkills,
            matchingSkills,
            hostAvgRating,
            hostReviewCount: hostReviews.length,
            hostTotalSessions,
          };
        }),
        basedOnSkills: wantedSkillNames,
      };
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getRecommendations for user ${userId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return empty result as fallback
        return {
          peers: [],
          studyRooms: [],
          basedOnSkills: [],
        };
      }

      // Re-throw other errors
      throw error;
    }
  }

  async getBrowseData(
    tab: 'peers' | 'studyRooms' | "webinars",
    search?: string,
    skills?: string[],
    page: number = 1,
    limit: number = 12,
    peerHasSocialLinks?: boolean,
    studyStatus?: SessionStatus,
    studyFreeOnly?: boolean,
    includeTrendingStudyRooms?: boolean,
    includeTrendingWebinars?: boolean,
    trendingLimit: number = 10,
  ) {
    // Create cache key from all query parameters
    const cacheKey = this.cacheService.createKey('browse:data', {
      tab,
      search,
      skills: skills?.sort().join(','),
      page,
      limit,
      peerHasSocialLinks,
      studyStatus,
      studyFreeOnly,
      includeTrendingStudyRooms,
      includeTrendingWebinars,
      trendingLimit,
    });

    // Cache for 2 minutes - browse data changes frequently
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const skip = (page - 1) * limit;

          // Build peer where clause for counting
          const peerWhere: any = {};
          if (search) {
            peerWhere.OR = [
              { name: { contains: search, mode: 'insensitive' } },
              { bio: { contains: search, mode: 'insensitive' } },
              {
                userSkills: {
                  some: {
                    type: 'HAS',
                    skill: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ];
          }
          if (skills && skills.length > 0) {
            peerWhere.userSkills = {
              some: {
                type: 'HAS',
                skill: { name: { in: skills } },
              },
            };
          }
          if (peerHasSocialLinks) {
            peerWhere.socialLinks = { not: null };
          }

          // Build study room where clause for counting
          // Include both UPCOMING and ONGOING study rooms
          const studyRoomWhere: any = {
            sessionStatus: studyStatus
              ? studyStatus
              : {
                  in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
                },
          };
          if (search) {
            studyRoomWhere.OR = [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              {
                createdBy: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
              {
                skills: {
                  some: {
                    skill: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ];
          }
          if (skills && skills.length > 0) {
            studyRoomWhere.skills = {
              some: {
                skill: { name: { in: skills } },
              },
            };
          }
          if (studyFreeOnly) {
            studyRoomWhere.joiningFee = 0;
          }

          // Get counts for both tabs (always calculated for search results display)
          const [peerCount, studyRoomCount] = await Promise.all([
            this.prisma.user.count({ where: peerWhere }),
            this.prisma.studyRoom.count({ where: studyRoomWhere }),
          ]);

          if (tab === 'peers') {
            const peerSortMostActive = !search && !(skills && skills.length > 0);
            const users = await this.prisma.user.findMany({
              where: peerWhere,
              skip,
              take: limit,
              include: {
                userSkills: {
                  where: { type: 'HAS' },
                  include: { skill: { select: { name: true } } },
                },
                reviewsReceived: {
                  select: { rating: true },
                },
                _count: {
                  select: {
                    peerSessionsRequested: {
                      where: { sessionStatus: SessionStatus.DONE },
                    },
                    peerSessionsReceived: {
                      where: { sessionStatus: SessionStatus.DONE },
                    },
                  },
                },
              },
              orderBy: peerSortMostActive
                ? [
                    { reviewsReceived: { _count: 'desc' } },
                    { name: 'asc' },
                  ]
                : { name: 'asc' },
            });

            return {
              peers: users.map((user) => {
                const reviews = user.reviewsReceived;
                const avgRating =
                  reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) /
                      reviews.length
                    : null;
                const totalSessions =
                  user._count.peerSessionsRequested +
                  user._count.peerSessionsReceived;

                return {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  bio: user.bio,
                  skills: user.userSkills.map((us) => us.skill.name),
                  rating: avgRating,
                  reviewCount: reviews.length,
                  totalSessions,
                  socialLinks: (user.socialLinks as any[]) || [],
                };
              }),
              studyRooms: [],
              trendingStudyRooms: [],
              trendingWebinars: [],
              counts: {
                peers: peerCount,
                studyRooms: studyRoomCount,
              },
              pagination: {
                total: peerCount,
                page,
                limit,
                totalPages: Math.ceil(peerCount / limit),
                hasMore: skip + limit < peerCount,
              },
            };
          } else {
            const studyRooms = await this.prisma.studyRoom.findMany({
              where: studyRoomWhere,
              distinct: ["slug"],
              skip,
              take: limit,
              select: {
                id: true,
                title: true,
                slug: true,
                seriesId: true,
                description: true,
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
                      select: { name: true },
                    },
                  },
                },
                learners: {
                  select: {
                    id: true,
                  },
                },
              },
              orderBy: { date: 'asc' },
            });

            const mappedStudyRooms = studyRooms.map((room) => {
              const hostReviews = room.createdBy.reviewsReceived;
              const hostAvgRating =
                hostReviews.length > 0
                  ? hostReviews.reduce((sum, r) => sum + r.rating, 0) /
                    hostReviews.length
                  : null;
              const hostTotalSessions =
                room.createdBy._count.studyRooms +
                room.createdBy._count.peerSessionsReceived;

              return {
                id: room.id,
                title: room.title,
                description: room.description,
                sessionStatus: room.sessionStatus,
                date: room.date,
                duration: room.duration,
                maxParticipants: room.maxParticipants,
                joiningFee: room.joiningFee,
                participantCount: room.learners.length,
                createdBy: {
                  id: room.createdBy.id,
                  name: room.createdBy.name,
                  avatar: room.createdBy.avatar,
                },
                skills: room.skills.map((s) => s.skill.name),
                hostAvgRating,
                hostReviewCount: hostReviews.length,
                hostTotalSessions,
                slug: room.slug,
                seriesId: room.seriesId
              };
            });

            const trendingStudyRooms = includeTrendingStudyRooms
              ? await this.getTrendingStudyRooms(trendingLimit)
              : [];

            const trendingWebinars =
              tab === 'webinars' && includeTrendingWebinars
                ? await this.getTrendingWebinars(trendingLimit)
                : [];

            return {
              peers: [],
              studyRooms: mappedStudyRooms,
              trendingStudyRooms,
              trendingWebinars,
              counts: {
                peers: peerCount,
                studyRooms: studyRoomCount,
              },
              pagination: {
                total: studyRoomCount,
                page,
                limit,
                totalPages: Math.ceil(studyRoomCount / limit),
                hasMore: skip + limit < studyRoomCount,
              },
            };
          }
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getBrowseData for tab ${tab}:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty result as fallback
            const emptyResult =
              tab === 'peers'
                ? {
                    peers: [],
                    studyRooms: [],
                    trendingStudyRooms: [],
                    trendingWebinars: [],
                    counts: { peers: 0, studyRooms: 0, webinars: 0 },
                    pagination: {
                      total: 0,
                      page,
                      limit,
                      totalPages: 0,
                      hasMore: false,
                    },
                  }
                : {
                    peers: [],
                    studyRooms: [],
                    trendingStudyRooms: [],
                    trendingWebinars: [],
                    counts: { peers: 0, studyRooms: 0, webinars: 0 },
                    pagination: {
                      total: 0,
                      page,
                      limit,
                      totalPages: 0,
                      hasMore: false,
                    },
                  };

            return emptyResult;
          }

          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }

  private async getTrendingStudyRooms(limit: number) {
    try {
      const rooms = await this.prisma.studyRoom.findMany({
        where: {
          sessionStatus: {
            in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
          },
        },
        distinct: ["slug"],
        take: limit,
        select: {
          id: true,
          slug:true,
          title: true,
          description: true,
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
                select: { name: true },
              },
            },
          },
          learners: {
            select: {
              id: true,
            },
          },
        },
        orderBy: [{ learners: { _count: 'desc' } }, { date: 'asc' }],
      });

      return rooms.map((room) => {
        const hostReviews = room.createdBy.reviewsReceived;
        const hostAvgRating =
          hostReviews.length > 0
            ? hostReviews.reduce((sum, r) => sum + r.rating, 0) /
              hostReviews.length
            : null;
        const hostTotalSessions =
          room.createdBy._count.studyRooms +
          room.createdBy._count.peerSessionsReceived;

        return {
          id: room.id,
          title: room.title,
          description: room.description,
          sessionStatus: room.sessionStatus,
          date: room.date,
          duration: room.duration,
          maxParticipants: room.maxParticipants,
          joiningFee: room.joiningFee,
          participantCount: room.learners.length,
          createdBy: {
            id: room.createdBy.id,
            name: room.createdBy.name,
            avatar: room.createdBy.avatar,
          },
          skills: room.skills.map((s) => s.skill.name),
          slug: room.slug,
          hostAvgRating,
          hostReviewCount: hostReviews.length,
          hostTotalSessions,
        };
      });
    } catch (error) {
      this.logger.warn({
        message: '[Browse] Trending study rooms query failed; returning empty list',
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  }

  private async getTrendingWebinars(limit: number) {
    try {
      const rooms = await this.prisma.studyRoom.findMany({
        where: {
          sessionMode: StudyRoomSessionMode.WEBINAR,
          sessionStatus: {
            in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
          },
        },
        distinct: ["slug"],
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
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
                select: { name: true },
              },
            },
          },
          learners: {
            select: {
              id: true,
            },
          },
        },
        orderBy: [{ learners: { _count: 'desc' } }, { date: 'asc' }],
      });

      return rooms.map((room) => {
        const hostReviews = room.createdBy.reviewsReceived;
        const hostAvgRating =
          hostReviews.length > 0
            ? hostReviews.reduce((sum, r) => sum + r.rating, 0) /
              hostReviews.length
            : null;
        const hostTotalSessions =
          room.createdBy._count.studyRooms +
          room.createdBy._count.peerSessionsReceived;

        return {
          id: room.id,
          title: room.title,
          description: room.description,
          sessionStatus: room.sessionStatus,
          date: room.date,
          duration: room.duration,
          maxParticipants: room.maxParticipants,
          joiningFee: room.joiningFee,
          participantCount: room.learners.length,
          createdBy: {
            id: room.createdBy.id,
            name: room.createdBy.name,
            avatar: room.createdBy.avatar,
          },
          skills: room.skills.map((s) => s.skill.name),
          slug: room.slug,
          hostAvgRating,
          hostReviewCount: hostReviews.length,
          hostTotalSessions,
        };
      });
    } catch (error) {
      this.logger.warn({
        message: '[Browse] Trending webinars query failed; returning empty list',
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  }

  /**
   * Get advanced peer matches based on weighted scores:
   * (Skills Match x 0.6) + (Availability Overlap x 0.3) + (Rating x 0.1)
   */
  async getRecommendedPeerMatches(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const dbUserId = await this.resolveDbUserId(userId);
      if (!dbUserId) {
        return {
          matches: [],
          pagination: { total: 0, page, limit, totalPages: 0, hasMore: false },
        };
      }

      // 1. Fetch current user's profile, skills, and availability
      const currentUser = await this.prisma.user.findUnique({
        where: { id: dbUserId },
        include: {
          userSkills: { include: { skill: true } },
          availability: true,
        },
      });

      if (!currentUser) return { matches: [], pagination: { total: 0, page, limit, totalPages: 0, hasMore: false } };

      const myWants = currentUser.userSkills
        .filter((us) => us.type === 'WANTS')
        .map((us) => us.skill.name.toLowerCase());

      const myHas = currentUser.userSkills
        .filter((us) => us.type === 'HAS')
        .map((us) => us.skill.name.toLowerCase());

      // 2. Fetch all other users (for calculation)
      // Note: For large datasets, we'd need to pre-filter or use a vector DB.
      // Here we filter by having at least one of my wanted skills.
      const candidates = await this.prisma.user.findMany({
        where: {
          id: { not: dbUserId },
          onboarded: true,
          userSkills: {
            some: {
              type: 'HAS',
              skill: {
                name: { in: currentUser.userSkills.filter(us => us.type === 'WANTS').map(us => us.skill.name) }
              }
            }
          }
        },
        include: {
          userSkills: { include: { skill: true } },
          availability: true,
          reviewsReceived: { select: { rating: true } },
          _count: {
            select: {
              peerSessionsRequested: { where: { sessionStatus: SessionStatus.DONE } },
              peerSessionsReceived: { where: { sessionStatus: SessionStatus.DONE } },
            },
          },
        },
      });

      const scoredMatches = candidates.map((peer) => {
        // --- Skill Score (0.6) ---
        const peerHas = peer.userSkills
          .filter((us) => us.type === 'HAS')
          .map((us) => us.skill.name.toLowerCase());
        
        const matchedWants = myWants.filter(s => peerHas.includes(s));
        // Use exact match logic as per requirement (any match = 1.0, or matched/total)
        // Given the requirement says "exact skill match = 1.0", I'll use 1.0 if any match.
        const skillScore = matchedWants.length > 0 ? 1.0 : 0;

        // --- Availability Score (0.3) ---
        // exact overlap = 1.0, partial = 0.5, no = 0
        let availabilityScore = 0;
        
        // Count days with overlapping available windows
        let overlapDays = 0;
        for (let day = 0; day < 7; day++) {
          const myBlock = currentUser.availability.find(a => a.dayOfWeek === day && a.isActive);
          const peerBlock = peer.availability.find(a => a.dayOfWeek === day && a.isActive);

          // If someone is totally available (no block), it's easier to overlap.
          // We'll calculate the union of unavailable blocks and see if there's space left.
          // For simplicity: if they have at least 1 hour of common availability.
          // 24 hours - union of blocked times.
          
          let blockedDuration = 0;
          if (myBlock && peerBlock) {
             // Union of intervals [ms, me] and [ps, pe]
             const ms = this.timeToMinutes(myBlock.startTime);
             const me = this.timeToMinutes(myBlock.endTime);
             const ps = this.timeToMinutes(peerBlock.startTime);
             const pe = this.timeToMinutes(peerBlock.endTime);
             
             // Combined blocked range [min(ms,ps), max(me,pe)] - wait no, union is more complex
             // Area of union:
             const startUnion = Math.min(ms, ps);
             const endUnion = Math.max(me, pe);
             const overlapBlocked = Math.max(0, Math.min(me, pe) - Math.max(ms, ps));
             blockedDuration = (me - ms) + (pe - ps) - overlapBlocked;
          } else if (myBlock) {
              blockedDuration = this.timeToMinutes(myBlock.endTime) - this.timeToMinutes(myBlock.startTime);
          } else if (peerBlock) {
              blockedDuration = this.timeToMinutes(peerBlock.endTime) - this.timeToMinutes(peerBlock.startTime);
          }
          
          if (blockedDuration < 24 * 60) {
              overlapDays++;
          }
        }

        if (overlapDays >= 5) availabilityScore = 1.0;
        else if (overlapDays >= 1) availabilityScore = 0.5;
        else availabilityScore = 0;

        // --- Rating Score (0.1) ---
        const ratings = peer.reviewsReceived;
        const avgRating = ratings.length > 0 
          ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length 
          : 3.5; // Default neutral rating
        const ratingScore = avgRating / 5.0;

        // --- Total Match Score ---
        const matchScore = (skillScore * 0.6) + (availabilityScore * 0.3) + (ratingScore * 0.1);

        return {
          id: peer.id,
          name: peer.name,
          avatar: peer.avatar,
          bio: peer.bio,
          skills: peerHas,
          matchedSkills: matchedWants,
          rating: ratings.length > 0 ? avgRating : null,
          reviewCount: ratings.length,
          totalSessions: peer._count.peerSessionsRequested + peer._count.peerSessionsReceived,
          matchScore,
          skillScore,
          availabilityScore,
          ratingScore,
        };
      });

      // Sort by match score
      scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

      // Paginate
      const skip = (page - 1) * limit;
      const paginatedMatches = scoredMatches.slice(skip, skip + limit);

      return {
        matches: paginatedMatches,
        pagination: {
          total: scoredMatches.length,
          page,
          limit,
          totalPages: Math.ceil(scoredMatches.length / limit),
          hasMore: skip + limit < scoredMatches.length,
        },
      };
    } catch (error) {
      this.logger.error('Error getting recommended peer matches:', error);
      throw error;
    }
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
}
