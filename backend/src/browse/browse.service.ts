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

    if (tab === 'peers') {
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (skills && skills.length > 0) {
        where.userSkills = {
          some: {
            type: 'HAS',
            skill: { name: { in: skills } },
          },
        };
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          include: {
            userSkills: {
              where: { type: 'HAS' },
              include: { skill: { select: { name: true } } },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        peers: users.map((user) => ({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          skills: user.userSkills.map((us) => us.skill.name),
        })),
        studyRooms: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      };
    } else {
      const where: any = {
        sessionStatus: SessionStatus.UPCOMING,
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (skills && skills.length > 0) {
        where.skills = {
          some: {
            skill: { name: { in: skills } },
          },
        };
      }

      const [studyRooms, total] = await Promise.all([
        this.prisma.studyRoom.findMany({
          where,
          skip,
          take: limit,
          include: {
            createdBy: { select: { id: true, name: true, avatar: true } },
            skills: { include: { skill: { select: { name: true } } } },
            learners: true,
          },
          orderBy: { date: 'asc' },
        }),
        this.prisma.studyRoom.count({ where }),
      ]);

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
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      };
    }
  }
}
