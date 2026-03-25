import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LivekitService } from '../livekit/livekit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateDebateRoomDto,
  UpdateDebateRoomDto,
  JoinDebateRoomDto,
  DebateRoomResponse,
  DebateResultsResponse,
  TurnOrderTypeDto,
  DebateSideDto,
  UpsertModeratorEvaluationDto,
  ModeratorEvaluationsQueryDto,
} from './dto/debate-room.dto';
import {
  Prisma,
  NotifType,
  DebateStatus,
  DebateSide,
  ParticipantStatus,
  TurnOrderType,
} from '../generated/prisma/client';
import { redisClient } from '../redis/redis.provider';
import { DebateAiService } from './debate-ai.service';
import { DebateMicControlService } from './debate-mic-control.service';
import { LoggerService } from '../common/logger';
import { isConnectionError } from '../common/db-error-handler';

// Redis key prefixes
const REDIS_KEYS = {
  debateState: (roomId: string) => `debate:${roomId}:state`,
  debateTranscripts: (roomId: string) => `debate:${roomId}:transcripts`,
  debateTimer: (roomId: string) => `debate:${roomId}:timer`,
  debateTeamChat: (roomId: string, side: string) =>
    `debate:${roomId}:chat:${side}`,
};

// Coin reward for winning team
const WINNER_COIN_REWARD = 50;
const MAX_MODERATORS = 3;

// Export enums for gateway to use
export { DebateStatus, DebateSide, ParticipantStatus, TurnOrderType };

export interface DebateState {
  status: DebateStatus;
  currentTurnIndex: number;
  currentSpeakerId: string | null;
  turnStartedAt: number | null;
  turnEndTime: number | null;
  prepEndTime: number | null;
}

@Injectable()
export class DebateRoomsService {
  constructor(
    private prisma: PrismaService,
    private livekitService: LivekitService,
    private notificationsService: NotificationsService,
    private debateAiService: DebateAiService,
    private micControlService: DebateMicControlService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DebateRoomsService.name);
  }

  /**
   * Create a new debate room
   */
  async createDebateRoom(
    userId: string,
    dto: CreateDebateRoomDto,
  ): Promise<DebateRoomResponse> {
    // Get user's internal ID from Clerk ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate LiveKit room name
    const livekitRoomName = `debate-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create debate room with teams
    const debateRoom = await this.prisma.debateRoom.create({
      data: {
        topic: dto.topic,
        description: dto.description,
        maxParticipants: dto.maxParticipants || 6,
        turnDurationSeconds: dto.turnDurationSeconds || 120,
        prepTimeSeconds: dto.prepTimeSeconds || 30,
        turnOrder: (dto.turnOrder as TurnOrderType) || TurnOrderType.FIFO,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        hostId: user.id,
        livekitRoomName,
        teams: {
          create: [{ side: DebateSide.FOR }, { side: DebateSide.AGAINST }],
        },
        moderators: {
          create: {
            userId: user.id,
            isHost: true,
          },
        },
      },
      include: this.getDebateRoomInclude(),
    });

    // Initialize Redis state
    const initialState: DebateState = {
      status: DebateStatus.WAITING,
      currentTurnIndex: 0,
      currentSpeakerId: null,
      turnStartedAt: null,
      turnEndTime: null,
      prepEndTime: null,
    };
    await redisClient.set(
      REDIS_KEYS.debateState(debateRoom.id),
      JSON.stringify(initialState),
      { EX: 86400 }, // 24 hour TTL
    );

    this.logger.log(`Debate room created: ${debateRoom.id} by user ${user.id}`);
    return this.mapToResponse(debateRoom);
  }

  /**
   * Update debate room settings (host only).
   * Edits are blocked once the debate is ended, processed, or cancelled.
   * While PREP or LIVE, only topic and description may change (not turn timing, order, or caps).
   */
  async updateDebateRoom(
    roomId: string,
    clerkUserId: string,
    dto: UpdateDebateRoomDto,
  ): Promise<DebateRoomResponse> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        teams: {
          include: {
            _count: { select: { participants: true } },
          },
        },
      },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }
    if (debateRoom.hostId !== user.id) {
      throw new ForbiddenException('Only the host can update this debate room');
    }
    const closedStatuses: DebateStatus[] = [
      DebateStatus.ENDED,
      DebateStatus.PROCESSED,
      DebateStatus.CANCELLED,
    ];
    if (closedStatuses.includes(debateRoom.status)) {
      throw new BadRequestException(
        'Cannot edit a debate that has ended, been completed, or was cancelled.',
      );
    }

    const structuralLockedStatuses: DebateStatus[] = [
      DebateStatus.PREP,
      DebateStatus.LIVE,
    ];
    if (structuralLockedStatuses.includes(debateRoom.status)) {
      if (
        dto.maxParticipants !== undefined ||
        dto.turnDurationSeconds !== undefined ||
        dto.prepTimeSeconds !== undefined ||
        dto.turnOrder !== undefined
      ) {
        throw new BadRequestException(
          'Cannot change turn timing, turn order, or max participants while the debate is in progress.',
        );
      }
    }

    if (dto.maxParticipants !== undefined) {
      const maxOnTeam = Math.max(
        ...debateRoom.teams.map((t) => t._count.participants),
        0,
      );
      if (dto.maxParticipants < maxOnTeam) {
        throw new BadRequestException(
          `Max participants per team must be at least ${maxOnTeam} (current largest team size)`,
        );
      }
    }

    const data: Prisma.DebateRoomUpdateInput = {};
    if (dto.topic !== undefined) {
      data.topic = dto.topic;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.maxParticipants !== undefined) {
      data.maxParticipants = dto.maxParticipants;
    }
    if (dto.turnDurationSeconds !== undefined) {
      data.turnDurationSeconds = dto.turnDurationSeconds;
    }
    if (dto.prepTimeSeconds !== undefined) {
      data.prepTimeSeconds = dto.prepTimeSeconds;
    }
    if (dto.turnOrder !== undefined) {
      data.turnOrder = dto.turnOrder as TurnOrderType;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes to apply');
    }

    const detailMarkedAt = new Date();
    data.hostDetailsUpdatedAt = detailMarkedAt;

    const updated = await this.prisma.debateRoom.update({
      where: { id: roomId },
      data,
      include: this.getDebateRoomInclude(),
    });

    const recipientIds = new Set<string>();
    for (const team of updated.teams) {
      for (const p of team.participants) {
        if (p.user?.id && p.user.id !== user.id) {
          recipientIds.add(p.user.id);
        }
      }
    }
    for (const m of updated.moderators) {
      if (m.user?.id && m.user.id !== user.id) {
        recipientIds.add(m.user.id);
      }
    }

    const timeLabel = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(detailMarkedAt);
    const topicSnippet =
      updated.topic.length > 80
        ? `${updated.topic.slice(0, 77)}…`
        : updated.topic;
    const debateMessage = `The debate you joined (“${topicSnippet}”) has updated details (${timeLabel}).`;

    for (const uid of recipientIds) {
      try {
        await this.notificationsService.createAndPushNotification(
          uid,
          debateMessage,
          'Debate updated',
          NotifType.NORMAL,
          {
            actionType: 'DEBATE_ROOM_DETAILS_UPDATED',
            actionData: { debateRoomId: roomId, sessionType: 'debateRoom' },
          },
        );
      } catch (err) {
        this.logger.error(
          `Failed to notify user ${uid} of debate room details update (${roomId})`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    this.logger.log(`Debate room updated: ${roomId} by host ${user.id}`);
    return this.mapToResponse(updated);
  }

  /**
   * Get debate room details
   */
  async getDebateRoom(
    roomId: string,
    userId?: string,
  ): Promise<DebateRoomResponse> {
    try {
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: this.getDebateRoomInclude(),
      });

      if (!debateRoom) {
        throw new NotFoundException('Debate room not found');
      }

      return this.mapToResponse(debateRoom);
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getDebateRoom for room ${roomId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Re-throw NotFoundException (room not found is a valid case)
        if (error instanceof NotFoundException) {
          throw error;
        }

        // For connection errors, throw a more user-friendly error
        throw new NotFoundException(
          'Unable to fetch debate room. Please try again later.',
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * List debate rooms with filters
   */
  async listDebateRooms(
    search?: string,
    status?: DebateStatus,
    page: number = 1,
    limit: number = 10,
    trending?: boolean,
    sort: 'hybrid' | 'newest' | 'upcoming' = 'newest',
  ) {
    try {
      const where: Prisma.DebateRoomWhereInput = {};

      if (search) {
        where.OR = [
          { topic: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (!trending && status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;
      const include = this.getDebateRoomInclude();

      if (trending) {
        const now = new Date();
        const liveWhere: Prisma.DebateRoomWhereInput = {
          ...where,
          status: DebateStatus.LIVE,
        };
        const waitingWhere: Prisma.DebateRoomWhereInput = {
          ...where,
          status: DebateStatus.WAITING,
          scheduledAt: {
            gte: now,
          },
        };

        const [liveTotal, waitingTotal] = await Promise.all([
          this.prisma.debateRoom.count({ where: liveWhere }),
          this.prisma.debateRoom.count({ where: waitingWhere }),
        ]);

        const total = liveTotal + waitingTotal;
        if (total === 0) {
          return {
            debateRooms: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }

        let remainingSkip = skip;
        let remainingTake = limit;
        const rooms: any[] = [];

        const liveSkip = Math.min(remainingSkip, liveTotal);
        remainingSkip -= liveSkip;
        const liveTake = Math.max(
          0,
          Math.min(remainingTake, liveTotal - liveSkip),
        );

        if (liveTake > 0) {
          const liveRooms = await this.prisma.debateRoom.findMany({
            where: liveWhere,
            skip: liveSkip,
            take: liveTake,
            orderBy: [
              { participants: { _count: 'desc' } },
              { createdAt: 'desc' },
            ],
            include,
          });
          rooms.push(...liveRooms);
          remainingTake -= liveRooms.length;
        }

        if (remainingTake > 0) {
          const waitingSkip = Math.max(0, remainingSkip);
          const waitingTake = Math.max(
            0,
            Math.min(remainingTake, waitingTotal - waitingSkip),
          );

          if (waitingTake > 0) {
            const waitingRooms = await this.prisma.debateRoom.findMany({
              where: waitingWhere,
              skip: waitingSkip,
              take: waitingTake,
              orderBy: [
                { scheduledAt: 'asc' },
                { participants: { _count: 'desc' } },
                { createdAt: 'desc' },
              ],
              include,
            });
            rooms.push(...waitingRooms);
          }
        }

        return {
          debateRooms: rooms.map((r) => this.mapToResponse(r)),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }

      const orderBy: Prisma.DebateRoomOrderByWithRelationInput[] =
        sort === 'upcoming'
          ? [{ scheduledAt: 'asc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

      const [rooms, total] = await Promise.all([
        this.prisma.debateRoom.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include,
        }),
        this.prisma.debateRoom.count({ where }),
      ]);

      return {
        debateRooms: rooms.map((r) => this.mapToResponse(r)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in listDebateRooms:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return empty debate rooms as fallback
        return {
          debateRooms: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Join a debate room as a participant
   * Auto-balances teams
   */
  async joinDebateRoom(
    roomId: string,
    userId: string,
    dto?: JoinDebateRoomDto,
  ): Promise<{ team: DebateSide; participantId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        teams: {
          include: {
            participants: true,
          },
        },
        moderators: true,
        participants: true,
      },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    if (debateRoom.status !== DebateStatus.WAITING) {
      throw new BadRequestException(
        'Cannot join a debate that has already started',
      );
    }

    // Check if scheduled time has passed
    if (debateRoom.scheduledAt && new Date() > debateRoom.scheduledAt) {
      throw new BadRequestException(
        'Cannot join after the scheduled time has passed',
      );
    }

    // Check if user is already a participant
    const existingParticipant = debateRoom.participants.find(
      (p) => p.userId === user.id,
    );
    if (existingParticipant) {
      throw new BadRequestException('You are already in this debate');
    }

    // Check if user is a moderator and is the only one
    const isModerator = debateRoom.moderators.some((m) => m.userId === user.id);
    if (isModerator && debateRoom.moderators.length === 1) {
      throw new BadRequestException(
        'You are the only moderator and cannot join as a participant. At least one moderator must remain.',
      );
    }

    // Get team counts
    const forTeam = debateRoom.teams.find((t) => t.side === DebateSide.FOR)!;
    const againstTeam = debateRoom.teams.find(
      (t) => t.side === DebateSide.AGAINST,
    )!;
    const forCount = forTeam.participants.filter(
      (p) => p.status === ParticipantStatus.ACTIVE,
    ).length;
    const againstCount = againstTeam.participants.filter(
      (p) => p.status === ParticipantStatus.ACTIVE,
    ).length;

    // Check capacity
    if (
      forCount >= debateRoom.maxParticipants &&
      againstCount >= debateRoom.maxParticipants
    ) {
      throw new BadRequestException('Debate room is full');
    }

    // Auto-balance: Assign to team with fewer members
    // If equal, consider preference, else random
    let assignedTeam: typeof forTeam;

    if (forCount < againstCount) {
      assignedTeam = forTeam;
    } else if (againstCount < forCount) {
      assignedTeam = againstTeam;
    } else {
      // Teams are equal, consider preference or randomize
      if (
        dto?.preferredSide === 'FOR' &&
        forCount < debateRoom.maxParticipants
      ) {
        assignedTeam = forTeam;
      } else if (
        dto?.preferredSide === 'AGAINST' &&
        againstCount < debateRoom.maxParticipants
      ) {
        assignedTeam = againstTeam;
      } else {
        // Random assignment
        assignedTeam = Math.random() < 0.5 ? forTeam : againstTeam;
      }
    }

    // Create participant
    const participant = await this.prisma.debateParticipant.create({
      data: {
        debateRoomId: roomId,
        teamId: assignedTeam.id,
        userId: user.id,
        status: ParticipantStatus.ACTIVE,
      },
    });

    this.logger.log(
      `User ${user.id} joined debate ${roomId} on team ${assignedTeam.side}`,
    );

    return {
      team: assignedTeam.side,
      participantId: participant.id,
    };
  }

  /**
   * Leave a debate room
   */
  async leaveDebateRoom(roomId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const participant = await this.prisma.debateParticipant.findFirst({
      where: {
        debateRoomId: roomId,
        userId: user.id,
        status: ParticipantStatus.ACTIVE,
      },
    });

    if (!participant) {
      throw new NotFoundException('You are not a participant in this debate');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
    });

    if (debateRoom?.status === DebateStatus.LIVE) {
      // During live debate, mark as disconnected instead of removing
      await this.prisma.debateParticipant.update({
        where: { id: participant.id },
        data: {
          status: ParticipantStatus.LEFT,
          disconnectedAt: new Date(),
        },
      });
    } else {
      // Before debate starts, can fully remove
      await this.prisma.debateParticipant.delete({
        where: { id: participant.id },
      });
    }

    this.logger.log(`User ${user.id} left debate ${roomId}`);
  }

  /**
   * Promote a user to moderator (max 3 total)
   */
  async promoteModerator(
    roomId: string,
    hostUserId: string,
    targetUserId: string,
  ): Promise<void> {
    const host = await this.prisma.user.findUnique({
      where: { id: hostUserId },
    });

    if (!host) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: { moderators: true },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    // Check if requester is the host
    if (debateRoom.hostId !== host.id) {
      throw new ForbiddenException('Only the host can promote moderators');
    }

    // Check max moderators
    if (debateRoom.moderators.length >= MAX_MODERATORS) {
      throw new BadRequestException(
        `Maximum ${MAX_MODERATORS} moderators allowed`,
      );
    }

    // Check if target is already a moderator
    const isAlreadyMod = debateRoom.moderators.some(
      (m) => m.userId === targetUserId,
    );
    if (isAlreadyMod) {
      throw new BadRequestException('User is already a moderator');
    }

    // Add as moderator
    await this.prisma.debateModerator.create({
      data: {
        debateRoomId: roomId,
        userId: targetUserId,
        isHost: false,
      },
    });

    // Remove from participants if they were one
    await this.prisma.debateParticipant.deleteMany({
      where: {
        debateRoomId: roomId,
        userId: targetUserId,
      },
    });

    this.logger.log(
      `User ${targetUserId} promoted to moderator in debate ${roomId}`,
    );
  }

  /**
   * Ban/kick a participant
   */
  async banParticipant(
    roomId: string,
    moderatorUserId: string,
    targetUserId: string,
    reason?: string,
  ): Promise<void> {
    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorUserId },
    });

    if (!moderator) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: { moderators: true },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    // Check if requester is a moderator
    const isMod = debateRoom.moderators.some((m) => m.userId === moderator.id);
    if (!isMod) {
      throw new ForbiddenException('Only moderators can ban participants');
    }

    // Find and ban participant
    const participant = await this.prisma.debateParticipant.findFirst({
      where: {
        debateRoomId: roomId,
        userId: targetUserId,
        status: ParticipantStatus.ACTIVE,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    await this.prisma.debateParticipant.update({
      where: { id: participant.id },
      data: { status: ParticipantStatus.BANNED },
    });

    // Mark their turn as skipped if they haven't gone yet
    await this.prisma.debateTurnQueue.updateMany({
      where: {
        participantId: participant.id,
        completed: false,
      },
      data: { skipped: true },
    });

    // Send notification
    await this.notificationsService.createNotification(
      targetUserId,
      `You have been removed from the debate: ${debateRoom.topic}${reason ? `. Reason: ${reason}` : ''}`,
      NotifType.URGENT,
    );

    this.logger.log(`User ${targetUserId} banned from debate ${roomId}`);
  }

  /**
   * Save or update moderator evaluation for a participant turn.
   * Evaluations are private to the moderator creating them.
   */
  async createOrUpdateModeratorEvaluation(
    roomId: string,
    moderatorClerkId: string,
    dto: UpsertModeratorEvaluationDto,
  ) {
    if (dto.notes === undefined && dto.scores === undefined) {
      throw new BadRequestException('Provide at least notes or scores');
    }

    const { user } = await this.assertModeratorInRoom(roomId, moderatorClerkId);

    const participant = await this.prisma.debateParticipant.findFirst({
      where: {
        id: dto.participantId,
        debateRoomId: roomId,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in this debate room');
    }

    const validatedScores =
      dto.scores !== undefined
        ? this.validateAndNormalizeScores(dto.scores)
        : undefined;

    const existing = await this.prisma.debateModeratorEvaluation.findUnique({
      where: {
        debateRoomId_participantId_moderatorId_turnNumber: {
          debateRoomId: roomId,
          participantId: dto.participantId,
          moderatorId: user.id,
          turnNumber: dto.turnNumber,
        },
      },
    });

    if (!existing) {
      return this.prisma.debateModeratorEvaluation.create({
        data: {
          debateRoomId: roomId,
          participantId: dto.participantId,
          moderatorId: user.id,
          turnNumber: dto.turnNumber,
          notes: dto.notes ?? null,
          scores: (validatedScores ?? {}) as Prisma.JsonObject,
        },
        include: {
          participant: {
            include: {
              user: {
                select: {
                  id: true,
                  clerkId: true,
                  name: true,
                  avatar: true,
                },
              },
              team: {
                select: { side: true },
              },
            },
          },
        },
      });
    }

    return this.prisma.debateModeratorEvaluation.update({
      where: { id: existing.id },
      data: {
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(validatedScores !== undefined
          ? { scores: validatedScores as Prisma.JsonObject }
          : {}),
      },
      include: {
        participant: {
          include: {
            user: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                avatar: true,
              },
            },
            team: {
              select: { side: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get current moderator's evaluations for a room (optionally filtered).
   */
  async getModeratorEvaluations(
    roomId: string,
    moderatorClerkId: string,
    query?: ModeratorEvaluationsQueryDto,
  ) {
    try {
      const { user } = await this.assertModeratorInRoom(
        roomId,
        moderatorClerkId,
      );

      return await this.prisma.debateModeratorEvaluation.findMany({
        where: {
          debateRoomId: roomId,
          moderatorId: user.id,
          ...(query?.participantId
            ? { participantId: query.participantId }
            : {}),
          ...(query?.turnNumber !== undefined
            ? { turnNumber: query.turnNumber }
            : {}),
        },
        include: {
          participant: {
            include: {
              user: {
                select: {
                  id: true,
                  clerkId: true,
                  name: true,
                  avatar: true,
                },
              },
              team: {
                select: { side: true },
              },
            },
          },
        },
        orderBy: [{ turnNumber: 'desc' }, { updatedAt: 'desc' }],
      });
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getModeratorEvaluations for room ${roomId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return empty evaluations as fallback
        return [];
      }

      // Re-throw other errors (ForbiddenException, NotFoundException, etc.)
      throw error;
    }
  }

  /**
   * Get current moderator's evaluations for a specific participant.
   */
  async getParticipantEvaluations(
    roomId: string,
    moderatorClerkId: string,
    participantId: string,
    turnNumber?: number,
  ) {
    try {
      const { user } = await this.assertModeratorInRoom(
        roomId,
        moderatorClerkId,
      );

      return await this.prisma.debateModeratorEvaluation.findMany({
        where: {
          debateRoomId: roomId,
          moderatorId: user.id,
          participantId,
          ...(turnNumber !== undefined ? { turnNumber } : {}),
        },
        include: {
          participant: {
            include: {
              user: {
                select: {
                  id: true,
                  clerkId: true,
                  name: true,
                  avatar: true,
                },
              },
              team: {
                select: { side: true },
              },
            },
          },
        },
        orderBy: [{ turnNumber: 'desc' }, { updatedAt: 'desc' }],
      });
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getParticipantEvaluations for room ${roomId}, participant ${participantId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return empty evaluations as fallback
        return [];
      }

      // Re-throw other errors (ForbiddenException, NotFoundException, etc.)
      throw error;
    }
  }

  /**
   * Start prep phase - only moderators can call this
   */
  async startPrepPhase(
    roomId: string,
    userId: string,
  ): Promise<{ prepEndTime: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        moderators: true,
        participants: {
          where: { status: ParticipantStatus.ACTIVE },
        },
        teams: {
          include: {
            participants: {
              where: { status: ParticipantStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    // Check if user is a moderator
    const isMod = debateRoom.moderators.some((m) => m.userId === user.id);
    if (!isMod) {
      throw new ForbiddenException('Only moderators can start the debate');
    }

    if (debateRoom.status !== DebateStatus.WAITING) {
      throw new BadRequestException('Debate has already started or ended');
    }

    // Check minimum participants (at least 1 per team)
    const forTeam = debateRoom.teams.find((t) => t.side === DebateSide.FOR);
    const againstTeam = debateRoom.teams.find(
      (t) => t.side === DebateSide.AGAINST,
    );

    if (!forTeam?.participants.length || !againstTeam?.participants.length) {
      throw new BadRequestException(
        'Each team must have at least one participant',
      );
    }

    // Generate turn queue
    await this.generateTurnQueue(debateRoom);

    // Update status
    await this.prisma.debateRoom.update({
      where: { id: roomId },
      data: { status: DebateStatus.PREP },
    });

    // Set prep end time in Redis
    const prepEndTime = Date.now() + debateRoom.prepTimeSeconds * 1000;
    const state: DebateState = {
      status: DebateStatus.PREP,
      currentTurnIndex: 0,
      currentSpeakerId: null,
      turnStartedAt: null,
      turnEndTime: null,
      prepEndTime,
    };
    await redisClient.set(
      REDIS_KEYS.debateState(roomId),
      JSON.stringify(state),
      { EX: 86400 },
    );

    // Enable mic for moderators during prep phase
    await this.micControlService.enableMicForModerators(roomId);

    this.logger.log(`Debate ${roomId} entering prep phase`);
    return { prepEndTime };
  }

  /**
   * Generate turn queue based on turn order setting
   */
  private async generateTurnQueue(debateRoom: any): Promise<void> {
    const forParticipants =
      debateRoom.teams
        .find((t: any) => t.side === DebateSide.FOR)
        ?.participants.filter(
          (p: any) => p.status === ParticipantStatus.ACTIVE,
        ) || [];

    const againstParticipants =
      debateRoom.teams
        .find((t: any) => t.side === DebateSide.AGAINST)
        ?.participants.filter(
          (p: any) => p.status === ParticipantStatus.ACTIVE,
        ) || [];

    // Sort by join time if FIFO, randomize if RANDOM
    if (debateRoom.turnOrder === TurnOrderType.RANDOM) {
      this.shuffleArray(forParticipants);
      this.shuffleArray(againstParticipants);
    } else {
      forParticipants.sort(
        (a: any, b: any) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      );
      againstParticipants.sort(
        (a: any, b: any) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      );
    }

    // Interleave: FOR1, AGAINST1, FOR2, AGAINST2, etc.
    const queue: { participantId: string; turnOrder: number }[] = [];
    const maxLen = Math.max(forParticipants.length, againstParticipants.length);
    let turnOrder = 0;

    for (let i = 0; i < maxLen; i++) {
      if (forParticipants[i]) {
        queue.push({
          participantId: forParticipants[i].id,
          turnOrder: turnOrder++,
        });
      }
      if (againstParticipants[i]) {
        queue.push({
          participantId: againstParticipants[i].id,
          turnOrder: turnOrder++,
        });
      }
    }

    // Clear existing queue and create new
    await this.prisma.debateTurnQueue.deleteMany({
      where: { debateRoomId: debateRoom.id },
    });

    await this.prisma.debateTurnQueue.createMany({
      data: queue.map((q) => ({
        debateRoomId: debateRoom.id,
        participantId: q.participantId,
        turnOrder: q.turnOrder,
      })),
    });
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Start the live debate phase (called after prep timer ends)
   */
  async startLiveDebate(roomId: string): Promise<{
    currentSpeakerId: string;
    turnEndTime: number;
  }> {
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        turnQueue: {
          where: { completed: false, skipped: false },
          orderBy: { turnOrder: 'asc' },
          include: {
            participant: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    const firstTurn = debateRoom.turnQueue[0];
    if (!firstTurn) {
      throw new BadRequestException('No participants in turn queue');
    }

    const now = Date.now();
    const turnEndTime = now + debateRoom.turnDurationSeconds * 1000;

    // Update database
    await this.prisma.debateRoom.update({
      where: { id: roomId },
      data: {
        status: DebateStatus.LIVE,
        startTime: new Date(),
        currentTurnIndex: 0,
        currentSpeakerId: firstTurn.participant.userId,
        turnStartedAt: new Date(),
      },
    });

    await this.prisma.debateTurnQueue.update({
      where: { id: firstTurn.id },
      data: { startedAt: new Date() },
    });

    // Update Redis state (use Clerk ID for frontend compatibility)
    const state: DebateState = {
      status: DebateStatus.LIVE,
      currentTurnIndex: 0,
      currentSpeakerId: firstTurn.participant.user.clerkId, // Use Clerk ID for frontend
      turnStartedAt: now,
      turnEndTime,
      prepEndTime: null,
    };
    await redisClient.set(
      REDIS_KEYS.debateState(roomId),
      JSON.stringify(state),
      { EX: 86400 },
    );

    // Mute all participants, then enable mic for first speaker
    await this.micControlService.muteAllParticipants(roomId, true);
    await this.micControlService.enableMicForSpeaker(
      roomId,
      firstTurn.participant.userId,
    );

    this.logger.log(
      `Debate ${roomId} started. First speaker: ${firstTurn.participant.user.name}`,
    );

    return {
      currentSpeakerId: firstTurn.participant.userId,
      turnEndTime,
    };
  }

  /**
   * Handle buzzer press or timer expiry - advance to next turn
   */
  async advanceToNextTurn(
    roomId: string,
    triggeredBy: 'buzzer' | 'timer' | 'skip',
  ): Promise<{
    finished: boolean;
    nextSpeakerId?: string;
    turnEndTime?: number;
    turnNumber?: number;
  }> {
    // Use Redis lock to ensure atomic state change
    const lockKey = `lock:debate:${roomId}:turn`;
    const lockAcquired = await redisClient.set(lockKey, '1', {
      NX: true,
      EX: 5,
    });

    if (!lockAcquired) {
      this.logger.warn(`Turn advance already in progress for debate ${roomId}`);
      throw new BadRequestException('Turn change in progress');
    }

    try {
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          turnQueue: {
            orderBy: { turnOrder: 'asc' },
            include: {
              participant: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!debateRoom || debateRoom.status !== DebateStatus.LIVE) {
        throw new BadRequestException('Debate is not in live state');
      }

      // Find current turn and mark as completed
      const currentTurn = debateRoom.turnQueue.find(
        (t) => !t.completed && !t.skipped,
      );

      if (currentTurn) {
        await this.prisma.debateTurnQueue.update({
          where: { id: currentTurn.id },
          data: {
            completed: true,
            endedAt: new Date(),
          },
        });

        await this.prisma.debateParticipant.update({
          where: { id: currentTurn.participantId },
          data: { turnCompleted: true },
        });

        // Commit any Redis transcripts to database
        await this.commitTranscriptsToDb(
          roomId,
          currentTurn.participantId,
          currentTurn.turnOrder,
        );

        // Mute previous speaker
        await this.micControlService.muteParticipant(
          roomId,
          currentTurn.participant.userId,
        );
      }

      // Find next speaker
      const nextTurnIndex = (currentTurn?.turnOrder ?? -1) + 1;
      const nextTurn = debateRoom.turnQueue.find(
        (t) => t.turnOrder === nextTurnIndex && !t.skipped,
      );

      if (!nextTurn) {
        // No more turns - debate ended
        await this.prisma.debateRoom.update({
          where: { id: roomId },
          data: {
            status: DebateStatus.ENDED,
            endTime: new Date(),
            currentSpeakerId: null,
          },
        });

        const endState: DebateState = {
          status: DebateStatus.ENDED,
          currentTurnIndex: nextTurnIndex,
          currentSpeakerId: null,
          turnStartedAt: null,
          turnEndTime: null,
          prepEndTime: null,
        };
        await redisClient.set(
          REDIS_KEYS.debateState(roomId),
          JSON.stringify(endState),
          { EX: 86400 },
        );

        // Mute all participants and enable mic for moderators
        await this.micControlService.muteAllParticipants(roomId, false);
        await this.micControlService.enableMicForModerators(roomId);

        this.logger.log(`Debate ${roomId} has ended`);
        return { finished: true };
      }

      // Set up next turn
      const now = Date.now();
      const turnEndTime = now + debateRoom.turnDurationSeconds * 1000;

      await this.prisma.debateRoom.update({
        where: { id: roomId },
        data: {
          currentTurnIndex: nextTurnIndex,
          currentSpeakerId: nextTurn.participant.userId,
          turnStartedAt: new Date(),
        },
      });

      await this.prisma.debateTurnQueue.update({
        where: { id: nextTurn.id },
        data: { startedAt: new Date() },
      });

      const state: DebateState = {
        status: DebateStatus.LIVE,
        currentTurnIndex: nextTurnIndex,
        currentSpeakerId: nextTurn.participant.user.clerkId, // Use Clerk ID for frontend
        turnStartedAt: now,
        turnEndTime,
        prepEndTime: null,
      };
      await redisClient.set(
        REDIS_KEYS.debateState(roomId),
        JSON.stringify(state),
        { EX: 86400 },
      );

      // Enable mic for next speaker
      await this.micControlService.enableMicForSpeaker(
        roomId,
        nextTurn.participant.userId,
      );

      this.logger.log(
        `Debate ${roomId} turn ${nextTurnIndex}: ${nextTurn.participant.user.name}`,
      );

      return {
        finished: false,
        nextSpeakerId: nextTurn.participant.userId,
        turnEndTime,
        turnNumber: nextTurnIndex,
      };
    } finally {
      await redisClient.del(lockKey);
    }
  }

  /**
   * Store transcript chunk in Redis
   * Reduced TTL from 2 hours to 10 minutes to prevent cache exhaustion
   */
  /**
   * Store transcript chunk in Redis
   * DISABLED: Transcript feature is turned off
   */
  async storeTranscriptChunk(
    roomId: string,
    participantId: string,
    text: string,
    timestamp: number,
  ): Promise<void> {
    // Feature disabled - return early without storing
    return;
  }

  /**
   * Commit Redis transcripts to database for a specific participant
   * DISABLED: Transcript feature is turned off
   */
  private async commitTranscriptsToDb(
    roomId: string,
    participantId: string,
    turnNumber: number,
  ): Promise<void> {
    // Feature disabled - return early without committing
    return;
  }

  /**
   * Stream all pending transcripts from Redis to database for a room
   * Used by the periodic scheduler to commit transcripts every 30 seconds
   * This prevents Redis cache exhaustion by keeping only recent chunks in memory
   */
  async streamTranscriptsToDatabase(roomId: string): Promise<number> {
    try {
      const key = REDIS_KEYS.debateTranscripts(roomId);

      // Check if key exists
      const exists = await redisClient.exists(key);
      if (!exists) {
        return 0;
      }

      // Get all chunks
      const chunks = await redisClient.lRange(key, 0, -1);
      if (chunks.length === 0) {
        return 0;
      }

      // Parse and group by participant
      const participantChunks = new Map<
        string,
        Array<{ text: string; timestamp: number }>
      >();

      chunks.forEach((chunkStr) => {
        try {
          const chunk = JSON.parse(chunkStr);
          if (chunk.participantId && chunk.text) {
            if (!participantChunks.has(chunk.participantId)) {
              participantChunks.set(chunk.participantId, []);
            }
            participantChunks.get(chunk.participantId)!.push({
              text: chunk.text,
              timestamp: chunk.timestamp,
            });
          }
        } catch {
          // Skip invalid chunks
        }
      });

      if (participantChunks.size === 0) {
        return 0;
      }

      // Get current turn numbers for each participant from the debate room
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          teams: {
            include: {
              participants: {
                include: {
                  turnQueueEntry: true,
                },
              },
            },
          },
        },
      });

      if (!debateRoom) {
        this.logger.warn(
          `Debate room ${roomId} not found for transcript streaming`,
        );
        return 0;
      }

      // Commit transcripts for each participant
      const totalCommitted = 0;
      for (const [participantId, texts] of participantChunks.entries()) {
        // Find participant to get current turn number
        const participant = debateRoom.teams
          .flatMap((team) => team.participants)
          .find((p) => p.id === participantId);

        if (!participant) {
          continue;
        }

        // Use turn number from turn queue if available, otherwise default to 0
        const turnNumber = participant.turnQueueEntry?.turnOrder ?? 0;
        const combinedText = texts.map((t) => t.text).join(' ');

        // if (combinedText.trim()) {
        //   await this.prisma.debateTranscript.create({
        //     data: {
        //       debateRoomId: roomId,
        //       participantId,
        //       turnNumber,
        //       text: combinedText,
        //     },
        //   });
        //   totalCommitted++;
        // }
      }

      // After committing, remove committed chunks from Redis
      // Keep only the last few chunks (last 30 seconds worth) as buffer
      // This dramatically reduces Redis memory usage
      const chunksToKeep = 10; // Keep last 10 chunks (~30 seconds of buffer)
      if (chunks.length > chunksToKeep) {
        // Remove all but the last chunksToKeep chunks
        await redisClient.lTrim(key, -chunksToKeep, -1);
        this.logger.debug(
          `Streamed ${totalCommitted} transcript entries to database for room ${roomId}, kept ${chunksToKeep} chunks in Redis buffer`,
        );
      } else {
        this.logger.debug(
          `Streamed ${totalCommitted} transcript entries to database for room ${roomId}`,
        );
      }

      return totalCommitted;
    } catch (error) {
      this.logger.error(
        `Failed to stream transcripts for room ${roomId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return 0;
    }
  }

  /**
   * Get all active debate room IDs that have transcripts in Redis
   * Used by the scheduler to know which rooms to process
   */
  async getActiveDebateRoomsWithTranscripts(): Promise<string[]> {
    try {
      const pattern = 'debate:*:transcripts';
      const keys = await redisClient.keys(pattern);

      // Extract room IDs from keys (format: debate:{roomId}:transcripts)
      const roomIds = keys
        .map((key) => {
          const match = key.match(/^debate:(.+):transcripts$/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => id !== null);

      // Verify rooms are still active (status is LIVE or PREP)
      const activeRooms = await this.prisma.debateRoom.findMany({
        where: {
          id: { in: roomIds },
          status: { in: [DebateStatus.LIVE, DebateStatus.PREP] },
        },
        select: { id: true },
      });

      return activeRooms.map((room) => room.id);
    } catch (error) {
      this.logger.error(
        'Failed to get active debate rooms with transcripts:',
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  /**
   * Generate result summaries from judge evaluations.
   * AI scoring is intentionally left pending for later integration.
   */
  async generateResults(
    roomId: string,
    userId: string,
  ): Promise<DebateResultsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        moderators: true,
        teams: {
          include: {
            participants: {
              where: {
                status: {
                  in: [ParticipantStatus.ACTIVE, ParticipantStatus.LEFT],
                },
              },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    // Check if user is a moderator
    const isMod = debateRoom.moderators.some((m) => m.userId === user.id);
    if (!isMod) {
      throw new ForbiddenException('Only moderators can generate results');
    }

    if (debateRoom.status !== DebateStatus.ENDED) {
      throw new BadRequestException(
        'Debate must be ended before generating results',
      );
    }

    const participantIds = debateRoom.teams.flatMap((team) =>
      team.participants.map((participant) => participant.id),
    );

    const moderatorEvaluations =
      await this.prisma.debateModeratorEvaluation.findMany({
        where: {
          debateRoomId: roomId,
          participantId: { in: participantIds },
        },
        include: {
          moderator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ participantId: 'asc' }, { createdAt: 'asc' }],
      });

    const evaluationsByParticipant = new Map<
      string,
      typeof moderatorEvaluations
    >();
    for (const evaluation of moderatorEvaluations) {
      const existing =
        evaluationsByParticipant.get(evaluation.participantId) ?? [];
      existing.push(evaluation);
      evaluationsByParticipant.set(evaluation.participantId, existing);
    }

    // Save reports to database
    for (const participantId of participantIds) {
      const evaluations = evaluationsByParticipant.get(participantId) ?? [];
      const aggregated = this.aggregateJudgeEvaluations(evaluations);

      await this.prisma.debateReport.upsert({
        where: { participantId },
        create: {
          debateRoomId: roomId,
          participantId,
          ideaScore: aggregated.ideaScore,
          clarityScore: aggregated.clarityScore,
          rebuttalScore: aggregated.rebuttalScore,
          overallScore: aggregated.overallScore,
          strengths: aggregated.strengths,
          weaknesses: aggregated.weaknesses,
          suggestions: aggregated.suggestions,
          summary: aggregated.summary,
        },
        update: {
          ideaScore: aggregated.ideaScore,
          clarityScore: aggregated.clarityScore,
          rebuttalScore: aggregated.rebuttalScore,
          overallScore: aggregated.overallScore,
          strengths: aggregated.strengths,
          weaknesses: aggregated.weaknesses,
          suggestions: aggregated.suggestions,
          summary: aggregated.summary,
        },
      });
    }

    // Calculate team scores and determine winner
    const teamScores = new Map<string, { total: number; count: number }>();

    for (const team of debateRoom.teams) {
      const teamParticipantIds = new Set(team.participants.map((p) => p.id));
      let totalScore = 0;
      let count = 0;

      for (const participantId of teamParticipantIds) {
        const aggregated = this.aggregateJudgeEvaluations(
          evaluationsByParticipant.get(participantId) ?? [],
        );
        totalScore += aggregated.overallScore;
        count += 1;
      }

      teamScores.set(team.id, {
        total: totalScore,
        count,
      });
    }

    // Determine winner
    let winningTeamId: string | null = null;
    let highestTotal = -1;
    let tie = false;

    for (const [teamId, scores] of teamScores.entries()) {
      const total = scores.total;
      if (total > highestTotal) {
        highestTotal = total;
        winningTeamId = teamId;
        tie = false;
      } else if (total === highestTotal) {
        tie = true;
      }
    }

    if (tie) {
      winningTeamId = null;
    }

    // Update teams with scores and winner
    for (const team of debateRoom.teams) {
      const scores = teamScores.get(team.id);
      await this.prisma.debateTeam.update({
        where: { id: team.id },
        data: {
          totalScore: scores?.total || 0,
          isWinner: team.id === winningTeamId,
        },
      });
    }

    // Award coins to winning team
    if (winningTeamId) {
      const winningTeam = debateRoom.teams.find((t) => t.id === winningTeamId);
      if (winningTeam) {
        for (const participant of winningTeam.participants) {
          await this.prisma.user.update({
            where: { id: participant.userId },
            data: {
              coins: { increment: WINNER_COIN_REWARD },
            },
          });

          await this.notificationsService.createNotification(
            participant.userId,
            `Congratulations! Your team won the debate "${debateRoom.topic}". You earned ${WINNER_COIN_REWARD} coins!`,
            NotifType.NORMAL,
          );
        }
      }
    }

    // Update debate status to PROCESSED
    await this.prisma.debateRoom.update({
      where: { id: roomId },
      data: { status: DebateStatus.PROCESSED },
    });

    this.logger.log(
      `Debate ${roomId} results generated from judge evaluations`,
    );

    return this.getResults(roomId, userId);
  }

  /**
   * Get debate results (respects privacy rules)
   */
  async getResults(
    roomId: string,
    userId: string,
  ): Promise<DebateResultsResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          moderators: true,
          teams: {
            include: {
              participants: {
                include: {
                  user: true,
                  report: true,
                },
              },
            },
          },
          reports: {
            include: {
              participant: {
                include: {
                  user: true,
                  team: true,
                },
              },
            },
          },
          moderatorEvaluations: {
            include: {
              moderator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: [{ participantId: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });

      if (!debateRoom) {
        throw new NotFoundException('Debate room not found');
      }

      if (debateRoom.status !== DebateStatus.PROCESSED) {
        throw new BadRequestException('Results not yet available');
      }

      const isMod = debateRoom.moderators.some((m) => m.userId === user.id);
      const userParticipant = debateRoom.teams
        .flatMap((t) => t.participants)
        .find((p) => p.userId === user.id);

      const winningTeam = debateRoom.teams.find((t) => t.isWinner);

      // Build response based on user role
      let reports: any[];

      if (isMod) {
        // Moderators see all reports
        reports = debateRoom.reports.map((r) => ({
          participantId: r.participantId,
          ideaScore: r.ideaScore,
          clarityScore: r.clarityScore,
          rebuttalScore: r.rebuttalScore,
          overallScore: r.overallScore,
          aiScore: null,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          suggestions: r.suggestions,
          summary: r.summary,
          judgeReviews: debateRoom.moderatorEvaluations
            .filter(
              (evaluation) => evaluation.participantId === r.participantId,
            )
            .map((evaluation) => ({
              moderatorId: evaluation.moderator.id,
              moderatorName: evaluation.moderator.name,
              turnNumber: evaluation.turnNumber,
              notes: evaluation.notes,
              scores: this.parseScoresJson(evaluation.scores),
              createdAt: evaluation.createdAt,
            })),
          participant: r.participant
            ? {
                user: {
                  id: r.participant.user.id,
                  name: r.participant.user.name,
                  avatar: r.participant.user.avatar,
                },
                team: {
                  side: r.participant.team.side,
                },
              }
            : undefined,
        }));
      } else if (userParticipant?.report) {
        // Participants only see their own report
        const r = userParticipant.report;
        reports = [
          {
            participantId: r.participantId,
            ideaScore: r.ideaScore,
            clarityScore: r.clarityScore,
            rebuttalScore: r.rebuttalScore,
            overallScore: r.overallScore,
            aiScore: null,
            strengths: r.strengths,
            weaknesses: r.weaknesses,
            suggestions: r.suggestions,
            summary: r.summary,
          },
        ];
      } else {
        reports = [];
      }

      return {
        debateRoomId: roomId,
        topic: debateRoom.topic,
        winningTeam: (winningTeam?.side as DebateSideDto) || null,
        aiScoringStatus: 'pending',
        teams: debateRoom.teams.map((t) => ({
          side: t.side as DebateSideDto,
          totalScore: t.totalScore || 0,
          isWinner: t.isWinner,
          participantCount: t.participants.length,
        })),
        reports,
      };
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getResults for room ${roomId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Re-throw NotFoundException and BadRequestException (valid cases)
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }

        // For connection errors, throw a more user-friendly error
        throw new NotFoundException(
          'Unable to fetch debate results. Please try again later.',
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  private parseScoresJson(scores: Prisma.JsonValue): Record<string, number> {
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
      return {};
    }

    const parsed: Record<string, number> = {};
    for (const [key, value] of Object.entries(
      scores as Record<string, unknown>,
    )) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        parsed[key] = value;
      }
    }
    return parsed;
  }

  private aggregateJudgeEvaluations(
    evaluations: Array<{ scores: Prisma.JsonValue }>,
  ): {
    ideaScore: number;
    clarityScore: number;
    rebuttalScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    summary: string;
  } {
    if (evaluations.length === 0) {
      return {
        ideaScore: 0,
        clarityScore: 0,
        rebuttalScore: 0,
        overallScore: 0,
        strengths: [],
        weaknesses: ['No judge reviews submitted.'],
        suggestions: [
          'Ask judges to submit scores before generating final results.',
        ],
        summary: 'No judge reviews were available for this participant.',
      };
    }

    const metric = (aliases: string[], fallbackFromAll = false): number => {
      const values: number[] = [];

      for (const evaluation of evaluations) {
        const scores = this.parseScoresJson(evaluation.scores);
        let chosen: number | null = null;
        for (const alias of aliases) {
          if (typeof scores[alias] === 'number') {
            chosen = scores[alias];
            break;
          }
        }
        if (chosen === null && fallbackFromAll) {
          const allValues = Object.values(scores);
          if (allValues.length > 0) {
            chosen =
              allValues.reduce((sum, value) => sum + value, 0) /
              allValues.length;
          }
        }
        if (chosen !== null) {
          values.push(chosen);
        }
      }

      if (values.length === 0) return 0;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };

    const clarityScore = metric([
      'clarityOfThoughts',
      'clarity',
      'clarityScore',
    ]);
    const ideaScore = metric([
      'argumentQuality',
      'ideaScore',
      'ideas',
      'arguments',
    ]);
    const rebuttalScore = metric([
      'factCheck',
      'rebuttalScore',
      'rebuttal',
      'facts',
    ]);
    const overallScore = metric([], true);

    return {
      ideaScore,
      clarityScore,
      rebuttalScore,
      overallScore,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      summary: `${evaluations.length} judge review(s) aggregated. AI score pending.`,
    };
  }

  /**
   * Get LiveKit token for debate room
   */
  async getLivekitToken(roomId: string, userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          moderators: true,
          participants: true,
        },
      });

      if (!debateRoom) {
        throw new NotFoundException('Debate room not found');
      }

      // Check if user is moderator or participant
      const isMod = debateRoom.moderators.some((m) => m.userId === user.id);
      const isParticipant = debateRoom.participants.some(
        (p) => p.userId === user.id,
      );

      if (!isMod && !isParticipant) {
        throw new ForbiddenException('You are not part of this debate');
      }

      const token = await this.livekitService.createToken({
        roomName: debateRoom.livekitRoomName || roomId,
        identity: user.clerkId, // Use clerkId for consistency with frontend
        name: user.name,
        metadata: JSON.stringify({
          avatar: user.avatar || null, // Include avatar URL for profile picture display
          isModerator: isMod,
          debateRoomId: roomId,
          userId: user.id, // Include database ID in metadata for reference
        }),
        publish: true, // Allow all participants to publish video/audio
        subscribe: true, // Allow subscribing to other tracks
        publishData: true, // Allow publishing chat messages
      });

      return token;
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getLivekitToken for room ${roomId}, user ${userId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Re-throw NotFoundException and ForbiddenException (valid cases)
        if (
          error instanceof NotFoundException ||
          error instanceof ForbiddenException
        ) {
          throw error;
        }

        // For connection errors, throw a more user-friendly error
        throw new NotFoundException(
          'Unable to generate access token. Please try again later.',
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get current debate state from Redis
   */
  async getDebateState(roomId: string): Promise<DebateState | null> {
    try {
      const stateStr = await redisClient.get(REDIS_KEYS.debateState(roomId));
      if (!stateStr) return null;
      const state = JSON.parse(stateStr);

      // Convert currentSpeakerId from database ID to Clerk ID if needed
      if (
        state.currentSpeakerId &&
        !state.currentSpeakerId.startsWith('user_')
      ) {
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: state.currentSpeakerId },
            select: { clerkId: true },
          });
          if (user) {
            state.currentSpeakerId = user.clerkId;
            // Update Redis with corrected ID
            await redisClient.set(
              REDIS_KEYS.debateState(roomId),
              JSON.stringify(state),
              { EX: 86400 },
            );
          }
        } catch (error) {
          // If conversion fails due to connection error, return state as-is
          if (isConnectionError(error)) {
            this.logger.warn(
              `Database connection error converting currentSpeakerId for room ${roomId}, returning state as-is`,
            );
          } else {
            this.logger.warn(
              `Failed to convert currentSpeakerId for room ${roomId}:`,
              error,
            );
          }
        }
      }

      return state;
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getDebateState for room ${roomId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return null as fallback (state not available)
        return null;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Cancel a debate (host only)
   */
  async cancelDebate(roomId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    if (debateRoom.hostId !== user.id) {
      throw new ForbiddenException('Only the host can cancel the debate');
    }

    if (debateRoom.status === DebateStatus.PROCESSED) {
      throw new BadRequestException('Cannot cancel a completed debate');
    }

    await this.prisma.debateRoom.update({
      where: { id: roomId },
      data: { status: DebateStatus.CANCELLED },
    });

    // Clean up Redis
    await redisClient.del(REDIS_KEYS.debateState(roomId));
    await redisClient.del(REDIS_KEYS.debateTranscripts(roomId));

    this.logger.log(`Debate ${roomId} cancelled by host ${user.id}`);
  }

  /**
   * End debate (moderator only)
   */
  async endDebate(
    roomId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        moderators: true,
      },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    const isMod = debateRoom.moderators.some((m) => m.userId === user.id);
    if (!isMod) {
      throw new ForbiddenException('Only moderators can end the debate');
    }

    if (
      debateRoom.status !== DebateStatus.LIVE &&
      debateRoom.status !== DebateStatus.PREP
    ) {
      throw new BadRequestException(
        'Debate is not in a state that can be ended',
      );
    }

    // Update status
    await this.prisma.debateRoom.update({
      where: { id: roomId },
      data: {
        status: DebateStatus.ENDED,
        endTime: new Date(),
        currentSpeakerId: null,
      },
    });

    // Update Redis state
    const endState: DebateState = {
      status: DebateStatus.ENDED,
      currentTurnIndex: debateRoom.currentTurnIndex,
      currentSpeakerId: null,
      turnStartedAt: null,
      turnEndTime: null,
      prepEndTime: null,
    };
    await redisClient.set(
      REDIS_KEYS.debateState(roomId),
      JSON.stringify(endState),
      { EX: 86400 },
    );

    // Mute all participants and enable mic for moderators
    await this.micControlService.muteAllParticipants(roomId, false);
    await this.micControlService.enableMicForModerators(roomId);

    this.logger.log(
      `Debate ${roomId} ended by moderator ${user.id}. Reason: ${reason || 'No reason provided'}`,
    );
  }

  /**
   * Helper: Get standard include for debate room queries
   */
  private getDebateRoomInclude() {
    return {
      host: {
        select: {
          id: true,
          clerkId: true,
          name: true,
          avatar: true,
        },
      },
      teams: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  clerkId: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      },
      moderators: {
        include: {
          user: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    };
  }

  /**
   * Helper: Map database entity to response DTO
   */
  private mapToResponse(debateRoom: any): DebateRoomResponse {
    return {
      id: debateRoom.id,
      topic: debateRoom.topic,
      description: debateRoom.description,
      status: debateRoom.status,
      maxParticipants: debateRoom.maxParticipants,
      turnDurationSeconds: debateRoom.turnDurationSeconds,
      prepTimeSeconds: debateRoom.prepTimeSeconds,
      turnOrder: debateRoom.turnOrder,
      currentTurnIndex: debateRoom.currentTurnIndex,
      currentSpeakerId: debateRoom.currentSpeakerId,
      turnStartedAt: debateRoom.turnStartedAt,
      scheduledAt: debateRoom.scheduledAt,
      startTime: debateRoom.startTime,
      endTime: debateRoom.endTime,
      host: debateRoom.host,
      teams: debateRoom.teams.map((t: any) => ({
        id: t.id,
        side: t.side,
        totalScore: t.totalScore,
        isWinner: t.isWinner,
        participants: t.participants.map((p: any) => ({
          id: p.id,
          side: t.side,
          status: p.status,
          turnCompleted: p.turnCompleted,
          user: p.user,
        })),
      })),
      moderators: debateRoom.moderators.map((m: any) => ({
        id: m.id,
        isHost: m.isHost,
        user: m.user,
      })),
      livekitRoomName: debateRoom.livekitRoomName,
      createdAt: debateRoom.createdAt,
      hostDetailsUpdatedAt: debateRoom.hostDetailsUpdatedAt
        ? debateRoom.hostDetailsUpdatedAt.toISOString()
        : null,
    };
  }

  private async assertModeratorInRoom(
    roomId: string,
    moderatorClerkId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: moderatorClerkId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: { moderators: true },
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    const isModerator = debateRoom.moderators.some((m) => m.userId === user.id);
    if (!isModerator) {
      throw new ForbiddenException('Only moderators can access evaluations');
    }

    return { user, debateRoom };
  }

  private validateAndNormalizeScores(
    scores: Record<string, number>,
  ): Record<string, number> {
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
      throw new BadRequestException(
        'Scores must be an object of factor keys and numeric values',
      );
    }

    const normalized: Record<string, number> = {};

    for (const [factorKey, rawValue] of Object.entries(scores)) {
      if (!factorKey.trim()) {
        throw new BadRequestException('Score factor key cannot be empty');
      }

      if (
        typeof rawValue !== 'number' ||
        Number.isNaN(rawValue) ||
        !Number.isFinite(rawValue)
      ) {
        throw new BadRequestException(
          `Score for "${factorKey}" must be a valid number`,
        );
      }

      if (rawValue < 0 || rawValue > 10) {
        throw new BadRequestException(
          `Score for "${factorKey}" must be between 0 and 10`,
        );
      }

      normalized[factorKey] = rawValue;
    }

    return normalized;
  }
}
