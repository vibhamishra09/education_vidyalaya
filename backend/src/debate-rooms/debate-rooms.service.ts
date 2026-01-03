import {
  Injectable,
  Logger,
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
} from './dto/debate-room.dto';
import {
  Prisma,
  NotifType,
  DebateStatus,
  DebateSide,
  ParticipantStatus,
  TurnOrderType,
} from '@prisma/client';
import { redisClient } from '../redis/redis.provider';
import { DebateAiService } from './debate-ai.service';

// Redis key prefixes
const REDIS_KEYS = {
  debateState: (roomId: string) => `debate:${roomId}:state`,
  debateTranscripts: (roomId: string) => `debate:${roomId}:transcripts`,
  debateTimer: (roomId: string) => `debate:${roomId}:timer`,
  debateTeamChat: (roomId: string, side: string) => `debate:${roomId}:chat:${side}`,
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
  private readonly logger = new Logger(DebateRoomsService.name);

  constructor(
    private prisma: PrismaService,
    private livekitService: LivekitService,
    private notificationsService: NotificationsService,
    private debateAiService: DebateAiService,
  ) {}

  /**
   * Create a new debate room
   */
  async createDebateRoom(userId: string, dto: CreateDebateRoomDto): Promise<DebateRoomResponse> {
    // Get user's internal ID from Clerk ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
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
          create: [
            { side: DebateSide.FOR },
            { side: DebateSide.AGAINST },
          ],
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
   * Get debate room details
   */
  async getDebateRoom(roomId: string, userId?: string): Promise<DebateRoomResponse> {
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: this.getDebateRoomInclude(),
    });

    if (!debateRoom) {
      throw new NotFoundException('Debate room not found');
    }

    return this.mapToResponse(debateRoom);
  }

  /**
   * List debate rooms with filters
   */
  async listDebateRooms(
    search?: string,
    status?: DebateStatus,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: Prisma.DebateRoomWhereInput = {};

    if (search) {
      where.OR = [
        { topic: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      this.prisma.debateRoom.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.getDebateRoomInclude(),
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
      where: { clerkId: userId },
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
      throw new BadRequestException('Cannot join a debate that has already started');
    }

    // Check if scheduled time has passed
    if (debateRoom.scheduledAt && new Date() > debateRoom.scheduledAt) {
      throw new BadRequestException('Cannot join after the scheduled time has passed');
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
      throw new BadRequestException('You are the only moderator and cannot join as a participant. At least one moderator must remain.');
    }

    // Get team counts
    const forTeam = debateRoom.teams.find((t) => t.side === DebateSide.FOR)!;
    const againstTeam = debateRoom.teams.find((t) => t.side === DebateSide.AGAINST)!;
    const forCount = forTeam.participants.filter(
      (p) => p.status === ParticipantStatus.ACTIVE,
    ).length;
    const againstCount = againstTeam.participants.filter(
      (p) => p.status === ParticipantStatus.ACTIVE,
    ).length;

    // Check capacity
    if (forCount >= debateRoom.maxParticipants && againstCount >= debateRoom.maxParticipants) {
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
      if (dto?.preferredSide === 'FOR' && forCount < debateRoom.maxParticipants) {
        assignedTeam = forTeam;
      } else if (dto?.preferredSide === 'AGAINST' && againstCount < debateRoom.maxParticipants) {
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
      where: { clerkId: userId },
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
      where: { clerkId: hostUserId },
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
      throw new BadRequestException(`Maximum ${MAX_MODERATORS} moderators allowed`);
    }

    // Check if target is already a moderator
    const isAlreadyMod = debateRoom.moderators.some((m) => m.userId === targetUserId);
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

    this.logger.log(`User ${targetUserId} promoted to moderator in debate ${roomId}`);
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
      where: { clerkId: moderatorUserId },
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
   * Start prep phase - only moderators can call this
   */
  async startPrepPhase(roomId: string, userId: string): Promise<{ prepEndTime: number }> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
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
    const againstTeam = debateRoom.teams.find((t) => t.side === DebateSide.AGAINST);

    if (!forTeam?.participants.length || !againstTeam?.participants.length) {
      throw new BadRequestException('Each team must have at least one participant');
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

    this.logger.log(`Debate ${roomId} entering prep phase`);
    return { prepEndTime };
  }

  /**
   * Generate turn queue based on turn order setting
   */
  private async generateTurnQueue(debateRoom: any): Promise<void> {
    const forParticipants = debateRoom.teams
      .find((t: any) => t.side === DebateSide.FOR)
      ?.participants.filter((p: any) => p.status === ParticipantStatus.ACTIVE) || [];
    
    const againstParticipants = debateRoom.teams
      .find((t: any) => t.side === DebateSide.AGAINST)
      ?.participants.filter((p: any) => p.status === ParticipantStatus.ACTIVE) || [];

    // Sort by join time if FIFO, randomize if RANDOM
    if (debateRoom.turnOrder === TurnOrderType.RANDOM) {
      this.shuffleArray(forParticipants);
      this.shuffleArray(againstParticipants);
    } else {
      forParticipants.sort((a: any, b: any) => 
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      );
      againstParticipants.sort((a: any, b: any) => 
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      );
    }

    // Interleave: FOR1, AGAINST1, FOR2, AGAINST2, etc.
    const queue: { participantId: string; turnOrder: number }[] = [];
    const maxLen = Math.max(forParticipants.length, againstParticipants.length);
    let turnOrder = 0;

    for (let i = 0; i < maxLen; i++) {
      if (forParticipants[i]) {
        queue.push({ participantId: forParticipants[i].id, turnOrder: turnOrder++ });
      }
      if (againstParticipants[i]) {
        queue.push({ participantId: againstParticipants[i].id, turnOrder: turnOrder++ });
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

    // Update Redis state
    const state: DebateState = {
      status: DebateStatus.LIVE,
      currentTurnIndex: 0,
      currentSpeakerId: firstTurn.participant.userId,
      turnStartedAt: now,
      turnEndTime,
      prepEndTime: null,
    };
    await redisClient.set(
      REDIS_KEYS.debateState(roomId),
      JSON.stringify(state),
      { EX: 86400 },
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
    const lockAcquired = await redisClient.set(lockKey, '1', { NX: true, EX: 5 });

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
        await this.commitTranscriptsToDb(roomId, currentTurn.participantId, currentTurn.turnOrder);
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
        currentSpeakerId: nextTurn.participant.userId,
        turnStartedAt: now,
        turnEndTime,
        prepEndTime: null,
      };
      await redisClient.set(
        REDIS_KEYS.debateState(roomId),
        JSON.stringify(state),
        { EX: 86400 },
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
   */
  async storeTranscriptChunk(
    roomId: string,
    participantId: string,
    text: string,
    timestamp: number,
  ): Promise<void> {
    const key = REDIS_KEYS.debateTranscripts(roomId);
    const entry = JSON.stringify({
      participantId,
      text,
      timestamp,
    });

    await redisClient.rPush(key, entry);
    
    // Set TTL if not already set
    const ttl = await redisClient.ttl(key);
    if (ttl === -1) {
      await redisClient.expire(key, 7200); // 2 hours
    }
  }

  /**
   * Commit Redis transcripts to database
   */
  private async commitTranscriptsToDb(
    roomId: string,
    participantId: string,
    turnNumber: number,
  ): Promise<void> {
    const key = REDIS_KEYS.debateTranscripts(roomId);
    const chunks = await redisClient.lRange(key, 0, -1);

    const participantChunks = chunks
      .map((c) => {
        try {
          return JSON.parse(c);
        } catch {
          return null;
        }
      })
      .filter((c) => c && c.participantId === participantId);

    if (participantChunks.length === 0) return;

    // Combine chunks into single transcript entry
    const combinedText = participantChunks.map((c) => c.text).join(' ');

    await this.prisma.debateTranscript.create({
      data: {
        debateRoomId: roomId,
        participantId,
        turnNumber,
        text: combinedText,
      },
    });

    this.logger.debug(
      `Committed ${participantChunks.length} transcript chunks for participant ${participantId}`,
    );
  }

  /**
   * Generate AI evaluation results
   */
  async generateResults(roomId: string, userId: string): Promise<DebateResultsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
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
              where: { status: { in: [ParticipantStatus.ACTIVE, ParticipantStatus.LEFT] } },
              include: { user: true },
            },
          },
        },
        transcripts: {
          include: {
            participant: {
              include: {
                user: true,
                team: true,
              },
            },
          },
          orderBy: { turnNumber: 'asc' },
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
      throw new BadRequestException('Debate must be ended before generating results');
    }

    // Call AI service to evaluate
    const evaluations = await this.debateAiService.evaluateDebate(
      debateRoom.topic,
      debateRoom.transcripts,
      debateRoom.teams,
    );

    // Save reports to database
    for (const evaluation of evaluations) {
      await this.prisma.debateReport.upsert({
        where: { participantId: evaluation.participantId },
        create: {
          debateRoomId: roomId,
          participantId: evaluation.participantId,
          ideaScore: evaluation.ideaScore,
          clarityScore: evaluation.clarityScore,
          rebuttalScore: evaluation.rebuttalScore,
          overallScore: evaluation.overallScore,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          suggestions: evaluation.suggestions,
          summary: evaluation.summary,
        },
        update: {
          ideaScore: evaluation.ideaScore,
          clarityScore: evaluation.clarityScore,
          rebuttalScore: evaluation.rebuttalScore,
          overallScore: evaluation.overallScore,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          suggestions: evaluation.suggestions,
          summary: evaluation.summary,
        },
      });
    }

    // Calculate team scores and determine winner
    const teamScores = new Map<string, { total: number; count: number }>();
    
    for (const team of debateRoom.teams) {
      const teamEvaluations = evaluations.filter((e) => {
        const participant = team.participants.find((p) => p.id === e.participantId);
        return !!participant;
      });

      const totalScore = teamEvaluations.reduce((sum, e) => sum + e.overallScore, 0);
      teamScores.set(team.id, {
        total: totalScore,
        count: teamEvaluations.length,
      });
    }

    // Determine winner
    let winningTeamId: string | null = null;
    let highestAvg = -1;

    for (const [teamId, scores] of teamScores.entries()) {
      const avg = scores.count > 0 ? scores.total / scores.count : 0;
      if (avg > highestAvg) {
        highestAvg = avg;
        winningTeamId = teamId;
      }
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
            participant.user.clerkId,
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

    this.logger.log(`Debate ${roomId} results generated`);

    return this.getResults(roomId, userId);
  }

  /**
   * Get debate results (respects privacy rules)
   */
  async getResults(roomId: string, userId: string): Promise<DebateResultsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
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
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        suggestions: r.suggestions,
        summary: r.summary,
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
      winningTeam: winningTeam?.side as DebateSideDto || null,
      teams: debateRoom.teams.map((t) => ({
        side: t.side as DebateSideDto,
        totalScore: t.totalScore || 0,
        isWinner: t.isWinner,
        participantCount: t.participants.length,
      })),
      reports,
    };
  }

  /**
   * Get LiveKit token for debate room
   */
  async getLivekitToken(roomId: string, userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
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
    const isParticipant = debateRoom.participants.some((p) => p.userId === user.id);

    if (!isMod && !isParticipant) {
      throw new ForbiddenException('You are not part of this debate');
    }

    const token = await this.livekitService.createToken({
      roomName: debateRoom.livekitRoomName || roomId,
      identity: user.clerkId, // Use clerkId for consistency with frontend
      name: user.name,
      metadata: JSON.stringify({
        isModerator: isMod,
        debateRoomId: roomId,
        userId: user.id, // Include database ID in metadata for reference
      }),
      publish: true, // Allow all participants to publish video/audio
      subscribe: true, // Allow subscribing to other tracks
      publishData: true, // Allow publishing chat messages
    });

    return token;
  }

  /**
   * Get current debate state from Redis
   */
  async getDebateState(roomId: string): Promise<DebateState | null> {
    const stateStr = await redisClient.get(REDIS_KEYS.debateState(roomId));
    if (!stateStr) return null;
    return JSON.parse(stateStr);
  }

  /**
   * Cancel a debate (host only)
   */
  async cancelDebate(roomId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
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
    };
  }
}
