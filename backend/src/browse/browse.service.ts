import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class BrowseService {
  constructor(private prisma: PrismaService) {}

  async getBrowseData(
    tab: 'peers' | 'studyRooms',
    search?: string,
    skills?: string[],
    page: number = 1,
    limit: number = 12,
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

    // Build study room where clause for counting
    const studyRoomWhere: any = {
      sessionStatus: SessionStatus.UPCOMING,
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
        },
      });

      return {
        peers: users.map((user) => ({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          skills: user.userSkills.map((us) => us.skill.name),
        })),
        studyRooms: [],
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
          createdBy: { select: { id: true, name: true, avatar: true } },
          skills: { include: { skill: { select: { name: true } } } },
          learners: true,
        },
        orderBy: { date: 'asc' },
      });

      return {
        peers: [],
        studyRooms: studyRooms.map((room) => ({
          id: room.id,
          title: room.title,
          description: room.description,
          sessionStatus: room.sessionStatus,
          date: room.date,
          duration: room.duration,
          maxParticipants: room.maxParticipants,
          participantCount: room.learners.length,
          createdBy: room.createdBy,
          skills: room.skills.map((s) => s.skill.name),
        })),
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
}
