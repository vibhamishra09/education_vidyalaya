import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class BrowseService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get personalized recommendations for a user based on their "want to learn" skills.
   * Returns peers who can teach those skills and study rooms covering those topics.
   */
  async getRecommendations(userId: string, limit: number = 8) {
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
        skills: { include: { skill: { select: { name: true } } } },
        learners: true,
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
          user._count.peerSessionsRequested + user._count.peerSessionsReceived;

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
  }

  async getBrowseData(
    tab: 'peers' | 'studyRooms',
    search?: string,
    skills?: string[],
    page: number = 1,
    limit: number = 12,
    peerHasSocialLinks?: boolean,
    studyStatus?: SessionStatus,
    studyFreeOnly?: boolean,
    includeTrendingStudyRooms?: boolean,
    trendingLimit: number = 4,
  ) {
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
        orderBy: { name: 'asc' }, // Sort by name alphabetically
      });

      return {
        peers: users.map((user) => {
          const reviews = user.reviewsReceived;
          const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;
          const totalSessions = user._count.peerSessionsRequested + user._count.peerSessionsReceived;
          
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
          skills: { include: { skill: { select: { name: true } } } },
          learners: true,
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
        };
      });

      const trendingStudyRooms = includeTrendingStudyRooms
        ? await this.getTrendingStudyRooms(trendingLimit)
        : [];

      return {
        peers: [],
        studyRooms: mappedStudyRooms,
        trendingStudyRooms,
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
  }

  private async getTrendingStudyRooms(limit: number) {
    const rooms = await this.prisma.studyRoom.findMany({
      where: {
        sessionStatus: {
          in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
        },
      },
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
        skills: { include: { skill: { select: { name: true } } } },
        learners: true,
      },
      orderBy: [{ learners: { _count: 'desc' } }, { date: 'asc' }],
    });

    return rooms.map((room) => {
      const hostReviews = room.createdBy.reviewsReceived;
      const hostAvgRating =
        hostReviews.length > 0
          ? hostReviews.reduce((sum, r) => sum + r.rating, 0) / hostReviews.length
          : null;
      const hostTotalSessions =
        room.createdBy._count.studyRooms + room.createdBy._count.peerSessionsReceived;

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
      };
    });
  }
}
