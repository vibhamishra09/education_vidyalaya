import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';
import { CreateStudyRoomDto, UpdateStudyRoomDto } from './dto/study-room.dto';
import { SessionStatus, NotifType, PaymentStatus } from '@prisma/client';
import { normalizeGoogleMeetLink } from '../utils/gmeet-generator';
import { convertLocalToUTC } from '../utils/timezone';

@Injectable()
export class StudyRoomsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private streaksService: StreaksService,
    private achievementsService: AchievementsService,
  ) {}

  async getStudyRooms(
    search?: string,
    skills?: string[],
    status?: SessionStatus,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    limit: number = 10,
  ) {
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

    const skip = (page - 1) * limit;

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

    const studyRoomCards = studyRooms.map((room) => ({
      id: room.id,
      title: room.title,
      description: room.description,
      sessionStatus: room.sessionStatus,
      date: room.date,
      duration: room.duration,
      maxParticipants: room.maxParticipants,
      joiningFee: room.joiningFee,
      gmeetLink: (room as any).gmeetLink,
      participantCount: room.learners.length,
      createdBy: room.createdBy,
      skills: room.skills.map((s) => s.skill.name),
    }));

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
  }

  async getStudyRoomDetails(studyRoomId: string, userId?: string) {
    console.log(125, studyRoomId, userId);
    const studyRoom = await this.prisma.studyRoom.findUnique({
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
    });

    if (!studyRoom) {
      throw new NotFoundException('Study room not found');
    }

    let role: 'teacher' | 'learner' | 'empty' = 'empty';
    if (userId) {
      // userId is actually clerkId, so we need to find the user by clerkId first
      const user = await this.prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });

      console.log(182, user);

      if (user) {
        if (studyRoom.createdById === user.id) {
          role = 'teacher';
        } else if (studyRoom.learners.some((l) => l.userId === user.id)) {
          role = 'learner';
        }
      }
    }

    // Find existing chat channel if any
    const channel = await this.prisma.channel.findFirst({
      where: { externalType: 'studyRoom', externalId: studyRoom.id },
      select: { id: true },
    });

    return {
      id: studyRoom.id,
      title: studyRoom.title,
      description: studyRoom.description,
      sessionStatus: studyRoom.sessionStatus,
      date: studyRoom.date,
      duration: studyRoom.duration,
      maxParticipants: studyRoom.maxParticipants,
      joiningFee: studyRoom.joiningFee,
      gmeetLink: (studyRoom as any).gmeetLink,
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
    const dateTime = convertLocalToUTC(createDto.date, createDto.time, createDto.timezone);

    // Normalize Google Meet link if provided
    const gmeetLink = createDto.gmeetLink ? normalizeGoogleMeetLink(createDto.gmeetLink) : null;

    // Create study room
    const studyRoom = await this.prisma.studyRoom.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        date: dateTime,
        duration: createDto.duration,
        maxParticipants: createDto.maxParticipants,
        joiningFee: createDto.joiningFee || 0,
        sessionStatus: SessionStatus.UPCOMING,
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
    await this.chatService.getOrCreateChannelForStudyRoom(studyRoom.id, [user.id]);

    return this.getStudyRoomDetails(studyRoom.id, userId);
  }

  async updateStudyRoom(studyRoomId: string, userId: string, updateDto: UpdateStudyRoomDto) {
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
      throw new ForbiddenException('Only the creator can update this study room');
    }

    const updateData: any = {};

    if (updateDto.title) updateData.title = updateDto.title;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.duration) updateData.duration = updateDto.duration;
    if (updateDto.maxParticipants) updateData.maxParticipants = updateDto.maxParticipants;
    if (updateDto.joiningFee !== undefined) updateData.joiningFee = updateDto.joiningFee;

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

    if (parseFloat(user.coins.toString()) < parseFloat(studyRoom.joiningFee.toString())) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_COINS',
        message: `You need ${parseFloat(studyRoom.joiningFee.toString()).toFixed(2)} coins to join this study room. You have ${parseFloat(user.coins.toString()).toFixed(2)} coins.`,
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
    await this.chatService.getOrCreateChannelForStudyRoom(studyRoomId, participantIds);

    // Get user name for notification
    const userWithName = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
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

    return {
      success: true,
      message: 'Successfully joined study room',
    };
  }
}
