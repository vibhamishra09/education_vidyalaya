import {} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createClerkClient } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import {
  DebateRoomsService,
  DebateStatus,
  ParticipantStatus,
} from './debate-rooms.service';
import { redisClient } from '../redis/redis.provider';
import { LoggerService } from '../common/logger';
import { corsOriginDelegate } from '../common/cors';

// Socket.io event types
interface JoinRoomPayload {
  roomId: string;
}

interface TeamChatPayload {
  roomId: string;
  message: string;
}

interface TranscriptPayload {
  roomId: string;
  text: string;
  timestamp: number;
}

interface BuzzerPayload {
  roomId: string;
}

interface ModeratorActionPayload {
  roomId: string;
  targetUserId?: string;
  action: 'mute' | 'unmute' | 'kick';
}

// Events emitted to clients
const DEBATE_EVENTS = {
  // Client -> Server
  JOIN_ROOM: 'debate:join_room',
  LEAVE_ROOM: 'debate:leave_room',
  TEAM_CHAT: 'debate:team_chat',
  TRANSCRIPT: 'debate:transcript',
  BUZZER: 'debate:buzzer',
  MODERATOR_ACTION: 'debate:moderator_action',
  START_PREP: 'debate:start_prep',
  ADVANCE_TURN: 'debate:advance_turn',
  END_DEBATE: 'debate:end',

  // Server -> Client
  USER_JOINED: 'debate:user_joined',
  USER_LEFT: 'debate:user_left',
  TEAM_MESSAGE: 'debate:team_message',
  PREP_STARTED: 'debate:prep_started',
  PREP_COUNTDOWN: 'debate:prep_countdown',
  DEBATE_STARTED: 'debate:debate_started',
  TURN_STARTED: 'debate:turn_started',
  TURN_COUNTDOWN: 'debate:turn_countdown',
  TURN_ENDED: 'debate:turn_ended',
  DEBATE_ENDED: 'debate:debate_ended',
  PARTICIPANT_BANNED: 'debate:participant_banned',
  SPEAKER_CHANGE: 'debate:speaker_change',
  STATE_UPDATE: 'debate:state_update',
  MIC_ENABLED: 'debate:mic_enabled',
  MIC_DISABLED: 'debate:mic_disabled',
  ERROR: 'debate:error',
};

// Redis keys
const REDIS_KEYS = {
  roomConnections: (roomId: string) => `debate:${roomId}:connections`,
  userRoom: (clerkId: string) => `debate:user:${clerkId}:room`,
};

@WebSocketGateway({
  namespace: '/debate',
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
})
export class DebateGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  // Active timers for prep and turns
  private prepTimers = new Map<string, NodeJS.Timeout>();
  private turnTimers = new Map<string, NodeJS.Timeout>();
  private countdownIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private debateRoomsService: DebateRoomsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DebateGateway.name);
  }

  /**
   * Handle WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('No token provided in WebSocket handshake');
        client.emit(DEBATE_EVENTS.ERROR, {
          message: 'Authentication required',
        });
        client.disconnect();
        return;
      }

      try {
        const clerkRequest = new Request('http://localhost:3001', {
          method: 'GET',
          headers: { authorization: `Bearer ${token}` },
        });

        const requestState = await this.clerkClient.authenticateRequest(
          clerkRequest,
          { jwtKey: process.env.CLERK_JWT_KEY },
        );

        if (!requestState.isSignedIn) {
          this.logger.warn('User is not authenticated');
          client.disconnect();
          return;
        }

        const auth = requestState.toAuth();
        if (!auth.userId) {
          this.logger.warn('User ID not found in token');
          client.disconnect();
          return;
        }

        // Get internal user ID
        const user = await this.prisma.user.findUnique({
          where: { clerkId: auth.userId },
          select: { id: true, name: true },
        });

        if (!user) {
          this.logger.warn('User not found in database');
          client.disconnect();
          return;
        }

        client.data.clerkId = auth.userId;
        client.data.userId = user.id;
        client.data.userName = user.name;

        this.logger.log(
          `🔌 Debate WebSocket connected - User: ${user.name}, Client: ${client.id}`,
        );
      } catch (verifyError: any) {
        this.logger.error('Token verification failed:', verifyError.message);
        client.disconnect();
      }
    } catch (error) {
      this.logger.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    const userName = client.data?.userName || 'unknown';

    this.logger.log(
      `🔌 Debate WebSocket disconnected - User: ${userName}, Client: ${client.id}`,
    );

    if (userId) {
      // Get the room the user was in
      const roomId = await redisClient.get(
        REDIS_KEYS.userRoom(client.data.clerkId),
      );

      if (roomId) {
        // Remove from room connections
        await redisClient.sRem(REDIS_KEYS.roomConnections(roomId), client.id);
        await redisClient.del(REDIS_KEYS.userRoom(client.data.clerkId));

        // Notify room
        this.server.to(roomId).emit(DEBATE_EVENTS.USER_LEFT, {
          userId,
          userName,
        });

        // Check if debate is live and user was current speaker
        await this.handleSpeakerDisconnect(roomId, userId);
      }
    }
  }

  /**
   * Handle speaker disconnection during their turn
   */
  private async handleSpeakerDisconnect(roomId: string, userId: string) {
    const state = await this.debateRoomsService.getDebateState(roomId);

    if (
      state &&
      state.status === DebateStatus.LIVE &&
      state.currentSpeakerId === userId
    ) {
      this.logger.log(`Speaker ${userId} disconnected during their turn`);

      // Mark participant as disconnected
      await this.prisma.debateParticipant.updateMany({
        where: {
          debateRoomId: roomId,
          userId,
          status: ParticipantStatus.ACTIVE,
        },
        data: {
          status: ParticipantStatus.DISCONNECTED,
          disconnectedAt: new Date(),
        },
      });

      // Skip their turn and move to next
      const result = await this.debateRoomsService.advanceToNextTurn(
        roomId,
        'skip',
      );

      if (result.finished) {
        this.handleDebateEnd(roomId);
      } else {
        // Get user's Clerk ID for mic events
        const disconnectedUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { clerkId: true },
        });

        // Get next speaker's Clerk ID
        const nextSpeaker = await this.prisma.user.findUnique({
          where: { id: result.nextSpeakerId },
          select: { clerkId: true },
        });

        // Emit mic disabled for disconnected speaker
        if (disconnectedUser) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_DISABLED, {
            participantId: disconnectedUser.clerkId,
            reason: 'turn_ended',
          });
        }

        // Emit mic enabled for next speaker
        if (nextSpeaker) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_ENABLED, {
            participantId: nextSpeaker.clerkId,
            reason: 'turn',
          });
        }

        this.server.to(roomId).emit(DEBATE_EVENTS.TURN_STARTED, {
          speakerId: result.nextSpeakerId,
          turnEndTime: result.turnEndTime,
          turnNumber: result.turnNumber,
          reason: 'Previous speaker disconnected',
        });

        // Start new turn timer
        this.startTurnTimer(roomId, result.turnEndTime!);
      }
    }
  }

  /**
   * Join a debate room
   */
  @SubscribeMessage(DEBATE_EVENTS.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { roomId } = payload;
    const userId = client.data.userId;
    const clerkId = client.data.clerkId;
    const userName = client.data.userName;

    if (!userId || !roomId) {
      client.emit(DEBATE_EVENTS.ERROR, { message: 'Invalid request' });
      return;
    }

    // Verify user is in this debate
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        moderators: true,
        participants: {
          include: {
            team: true,
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        teams: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    if (!debateRoom) {
      client.emit(DEBATE_EVENTS.ERROR, { message: 'Debate room not found' });
      return;
    }

    const isMod = debateRoom.moderators.some((m) => m.userId === userId);
    const isParticipant = debateRoom.participants.some(
      (p) => p.userId === userId,
    );

    if (!isMod && !isParticipant) {
      client.emit(DEBATE_EVENTS.ERROR, {
        message: 'You are not part of this debate',
      });
      return;
    }

    // Join socket room
    client.join(roomId);

    // Find participant's team
    const participant = debateRoom.participants.find(
      (p) => p.userId === userId,
    );
    if (participant) {
      // Join team-specific room for private chat
      client.join(`${roomId}:team:${participant.team.side}`);
    }

    // Track connection
    await redisClient.sAdd(REDIS_KEYS.roomConnections(roomId), client.id);
    await redisClient.set(REDIS_KEYS.userRoom(clerkId), roomId, { EX: 86400 });

    // Notify room
    this.server.to(roomId).emit(DEBATE_EVENTS.USER_JOINED, {
      userId,
      userName,
      isModerator: isMod,
      team: participant?.team.side || null,
    });

    // Send current state to joining user
    const state = await this.debateRoomsService.getDebateState(roomId);
    client.emit(DEBATE_EVENTS.STATE_UPDATE, {
      room: debateRoom,
      state,
    });

    this.logger.log(`User ${userName} joined debate room ${roomId}`);
  }

  /**
   * Leave a debate room
   */
  @SubscribeMessage(DEBATE_EVENTS.LEAVE_ROOM)
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { roomId } = payload;
    const userId = client.data.userId;
    const clerkId = client.data.clerkId;
    const userName = client.data.userName;

    client.leave(roomId);

    // Leave team room too
    const participant = await this.prisma.debateParticipant.findFirst({
      where: { debateRoomId: roomId, userId },
      include: { team: true },
    });
    if (participant) {
      client.leave(`${roomId}:team:${participant.team.side}`);
    }

    await redisClient.sRem(REDIS_KEYS.roomConnections(roomId), client.id);
    await redisClient.del(REDIS_KEYS.userRoom(clerkId));

    this.server.to(roomId).emit(DEBATE_EVENTS.USER_LEFT, {
      userId,
      userName,
    });

    this.logger.log(`User ${userName} left debate room ${roomId}`);
  }

  /**
   * Team-only chat during prep phase
   */
  @SubscribeMessage(DEBATE_EVENTS.TEAM_CHAT)
  async handleTeamChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TeamChatPayload,
  ) {
    const { roomId, message } = payload;
    const userId = client.data.userId;
    const userName = client.data.userName;

    // Find participant's team
    const participant = await this.prisma.debateParticipant.findFirst({
      where: { debateRoomId: roomId, userId },
      include: { team: true },
    });

    if (!participant) {
      client.emit(DEBATE_EVENTS.ERROR, {
        message: 'You are not a participant',
      });
      return;
    }

    // Check if in prep phase
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
    });

    if (debateRoom?.status !== DebateStatus.PREP) {
      client.emit(DEBATE_EVENTS.ERROR, {
        message: 'Team chat is only available during prep phase',
      });
      return;
    }

    // Send to team members only
    const teamRoom = `${roomId}:team:${participant.team.side}`;
    this.server.to(teamRoom).emit(DEBATE_EVENTS.TEAM_MESSAGE, {
      userId,
      userName,
      team: participant.team.side,
      message,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle transcript chunks from speech recognition
   * DISABLED: Transcript feature is turned off
   */
  @SubscribeMessage(DEBATE_EVENTS.TRANSCRIPT)
  async handleTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TranscriptPayload,
  ) {
    // Feature disabled - return early without processing
    return;
  }

  /**
   * Handle buzzer press (speaker done early)
   */
  @SubscribeMessage(DEBATE_EVENTS.BUZZER)
  async handleBuzzer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BuzzerPayload,
  ) {
    const { roomId } = payload;
    const userId = client.data.userId;

    // Verify user is current speaker
    const state = await this.debateRoomsService.getDebateState(roomId);

    if (
      !state ||
      state.status !== DebateStatus.LIVE ||
      state.currentSpeakerId !== userId
    ) {
      client.emit(DEBATE_EVENTS.ERROR, { message: 'It is not your turn' });
      return;
    }

    this.logger.log(`Buzzer pressed by ${userId} in debate ${roomId}`);

    // Clear turn timer
    this.clearTurnTimer(roomId);

    // Advance to next turn
    try {
      const result = await this.debateRoomsService.advanceToNextTurn(
        roomId,
        'buzzer',
      );

      if (result.finished) {
        this.handleDebateEnd(roomId);
      } else {
        // Get current and next participant details
        const [currentState, nextParticipant, debateRoom] = await Promise.all([
          this.debateRoomsService.getDebateState(roomId),
          this.prisma.debateParticipant.findFirst({
            where: {
              debateRoomId: roomId,
              userId: result.nextSpeakerId,
            },
            include: {
              user: { select: { id: true, name: true, clerkId: true } },
              team: { select: { side: true } },
            },
          }),
          this.prisma.debateRoom.findUnique({
            where: { id: roomId },
            select: { turnDurationSeconds: true },
          }),
        ]);

        // Emit TURN_ENDED for current speaker if we have their info
        if (currentState?.currentSpeakerId) {
          const currentParticipant =
            await this.prisma.debateParticipant.findFirst({
              where: {
                debateRoomId: roomId,
                userId: currentState.currentSpeakerId,
              },
              include: {
                user: { select: { id: true, name: true, clerkId: true } },
                team: { select: { side: true } },
              },
            });

          if (currentParticipant) {
            this.server.to(roomId).emit(DEBATE_EVENTS.TURN_ENDED, {
              participantId: currentParticipant.id,
              participantUserId: currentParticipant.user.clerkId,
              nextParticipantId: nextParticipant?.id,
              nextParticipantUserId: nextParticipant?.user.clerkId,
              nextSide: nextParticipant?.team.side,
            });

            // Use Clerk ID for mic events
            this.server.to(roomId).emit(DEBATE_EVENTS.MIC_DISABLED, {
              participantId: currentParticipant.user.clerkId,
              reason: 'turn_ended',
            });
          }
        }

        // Emit mic enabled for next speaker
        if (nextParticipant) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_ENABLED, {
            participantId: nextParticipant.user.clerkId,
            reason: 'turn',
          });
        }

        // Emit TURN_STARTED for next speaker
        if (nextParticipant) {
          const state = await this.debateRoomsService.getDebateState(roomId);
          this.server.to(roomId).emit(DEBATE_EVENTS.TURN_STARTED, {
            participantId: nextParticipant.id,
            participantUserId: nextParticipant.user.clerkId,
            participantName: nextParticipant.user.name,
            side: nextParticipant.team.side,
            turnIndex: result.turnNumber || 0,
            duration: debateRoom?.turnDurationSeconds || 0,
            startedAt: state?.turnStartedAt
              ? new Date(state.turnStartedAt).toISOString()
              : new Date().toISOString(),
          });
        }

        // Start new turn timer
        this.startTurnTimer(roomId, result.turnEndTime!);
      }
    } catch (error: any) {
      client.emit(DEBATE_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Start prep phase (moderator only, via socket)
   */
  @SubscribeMessage(DEBATE_EVENTS.START_PREP)
  async handleStartPrep(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { roomId } = payload;
    const clerkId = client.data.clerkId;

    try {
      const result = await this.debateRoomsService.startPrepPhase(
        roomId,
        clerkId,
      );

      // Get updated room and state
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          moderators: { include: { user: true } },
          participants: {
            include: {
              team: true,
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
          teams: {
            include: {
              participants: {
                include: {
                  user: { select: { id: true, name: true, avatar: true } },
                },
              },
            },
          },
        },
      });

      const state = await this.debateRoomsService.getDebateState(roomId);

      // Notify all in room with updated state
      this.server.to(roomId).emit(DEBATE_EVENTS.PREP_STARTED, {
        prepEndTime: result.prepEndTime,
      });

      // Emit state update to all clients
      if (debateRoom && state) {
        this.server.to(roomId).emit(DEBATE_EVENTS.STATE_UPDATE, {
          room: debateRoom,
          state,
        });
      }

      // Emit mic enabled for moderators
      if (debateRoom) {
        for (const moderator of debateRoom.moderators) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_ENABLED, {
            participantId: moderator.user.clerkId,
            reason: 'moderator',
          });
        }
      }

      // Start prep countdown
      this.startPrepTimer(roomId, result.prepEndTime);

      this.logger.log(`Prep phase started for debate ${roomId}`);
    } catch (error: any) {
      client.emit(DEBATE_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Advance turn (moderator only)
   */
  @SubscribeMessage(DEBATE_EVENTS.ADVANCE_TURN)
  async handleAdvanceTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { roomId } = payload;
    const clerkId = client.data.clerkId;

    // Verify moderator
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      client.emit(DEBATE_EVENTS.ERROR, { message: 'User not found' });
      return;
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: { moderators: true },
    });

    if (!debateRoom) {
      client.emit(DEBATE_EVENTS.ERROR, { message: 'Debate room not found' });
      return;
    }

    const isMod = debateRoom.moderators.some((m) => m.userId === user.id);
    if (!isMod) {
      client.emit(DEBATE_EVENTS.ERROR, {
        message: 'Only moderators can advance turns',
      });
      return;
    }

    try {
      const result = await this.debateRoomsService.advanceToNextTurn(
        roomId,
        'skip',
      );

      if (result.finished) {
        await this.handleDebateEnd(roomId);
      } else {
        // Get current and next participant details
        const [currentState, nextParticipant, debateRoom] = await Promise.all([
          this.debateRoomsService.getDebateState(roomId),
          this.prisma.debateParticipant.findFirst({
            where: {
              debateRoomId: roomId,
              userId: result.nextSpeakerId,
            },
            include: {
              user: { select: { id: true, name: true, clerkId: true } },
              team: { select: { side: true } },
            },
          }),
          this.prisma.debateRoom.findUnique({
            where: { id: roomId },
            select: { turnDurationSeconds: true },
          }),
        ]);

        // Emit TURN_ENDED for current speaker if we have their info
        if (currentState?.currentSpeakerId) {
          const currentParticipant =
            await this.prisma.debateParticipant.findFirst({
              where: {
                debateRoomId: roomId,
                userId: currentState.currentSpeakerId,
              },
              include: {
                user: { select: { id: true, name: true, clerkId: true } },
                team: { select: { side: true } },
              },
            });

          if (currentParticipant) {
            this.server.to(roomId).emit(DEBATE_EVENTS.TURN_ENDED, {
              participantId: currentParticipant.id,
              participantUserId: currentParticipant.user.clerkId,
              nextParticipantId: nextParticipant?.id,
              nextParticipantUserId: nextParticipant?.user.clerkId,
              nextSide: nextParticipant?.team.side,
            });

            // Use Clerk ID for mic events
            this.server.to(roomId).emit(DEBATE_EVENTS.MIC_DISABLED, {
              participantId: currentParticipant.user.clerkId,
              reason: 'turn_ended',
            });
          }
        }

        // Emit mic enabled for next speaker
        if (nextParticipant) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_ENABLED, {
            participantId: nextParticipant.user.clerkId,
            reason: 'turn',
          });
        }

        // Emit TURN_STARTED for next speaker
        if (nextParticipant) {
          const state = await this.debateRoomsService.getDebateState(roomId);
          this.server.to(roomId).emit(DEBATE_EVENTS.TURN_STARTED, {
            participantId: nextParticipant.id,
            participantUserId: nextParticipant.user.clerkId,
            participantName: nextParticipant.user.name,
            side: nextParticipant.team.side,
            turnIndex: result.turnNumber || 0,
            duration: debateRoom?.turnDurationSeconds || 0,
            startedAt: state?.turnStartedAt
              ? new Date(state.turnStartedAt).toISOString()
              : new Date().toISOString(),
          });
        }

        // Start new turn timer
        this.startTurnTimer(roomId, result.turnEndTime!);
      }
    } catch (error: any) {
      client.emit(DEBATE_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * End debate (moderator only)
   */
  @SubscribeMessage(DEBATE_EVENTS.END_DEBATE)
  async handleEndDebate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload & { reason?: string },
  ) {
    const { roomId, reason } = payload;
    const clerkId = client.data.clerkId;

    try {
      await this.debateRoomsService.endDebate(roomId, clerkId, reason);
      this.clearTurnTimer(roomId);
      this.clearPrepTimer(roomId);

      // Emit mic disabled for all participants
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          participants: { include: { user: true } },
          moderators: { include: { user: true } },
        },
      });

      if (debateRoom) {
        // Emit mic disabled for all participants
        for (const participant of debateRoom.participants) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_DISABLED, {
            participantId: participant.user.clerkId,
            reason: 'debate_ended',
          });
        }

        // Emit mic enabled for moderators
        for (const moderator of debateRoom.moderators) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_ENABLED, {
            participantId: moderator.user.clerkId,
            reason: 'moderator',
          });
        }
      }

      this.server.to(roomId).emit(DEBATE_EVENTS.DEBATE_ENDED, {
        message: reason || 'Debate ended by moderator.',
      });

      this.logger.log(`Debate ${roomId} ended by moderator`);
    } catch (error: any) {
      client.emit(DEBATE_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Moderator actions (mute/unmute/kick)
   */
  @SubscribeMessage(DEBATE_EVENTS.MODERATOR_ACTION)
  async handleModeratorAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ModeratorActionPayload,
  ) {
    const { roomId, targetUserId, action } = payload;
    const clerkId = client.data.clerkId;

    // Verify moderator
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      client.emit(DEBATE_EVENTS.ERROR, { message: 'User not found' });
      return;
    }

    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: { moderators: true },
    });

    if (!debateRoom) {
      client.emit(DEBATE_EVENTS.ERROR, { message: 'Debate room not found' });
      return;
    }

    const isMod = debateRoom.moderators.some((m) => m.userId === user.id);
    if (!isMod) {
      client.emit(DEBATE_EVENTS.ERROR, {
        message: 'Only moderators can perform this action',
      });
      return;
    }

    if (action === 'kick' && targetUserId) {
      await this.debateRoomsService.banParticipant(
        roomId,
        clerkId,
        targetUserId,
      );

      this.server.to(roomId).emit(DEBATE_EVENTS.PARTICIPANT_BANNED, {
        userId: targetUserId,
      });
    }

    // For mute/unmute, these are handled by LiveKit track permissions
    // We just broadcast the intent
    this.server.to(roomId).emit(DEBATE_EVENTS.STATE_UPDATE, {
      action,
      targetUserId,
      moderatorId: user.id,
    });
  }

  /**
   * Start prep phase timer
   */
  private startPrepTimer(roomId: string, prepEndTime: number) {
    // Clear any existing timer
    this.clearPrepTimer(roomId);

    const now = Date.now();
    const duration = prepEndTime - now;

    if (duration <= 0) {
      this.handlePrepEnd(roomId);
      return;
    }

    // Countdown interval (every second)
    const countdownKey = `prep:${roomId}`;
    let remaining = Math.ceil(duration / 1000);

    const interval = setInterval(() => {
      remaining--;
      this.server.to(roomId).emit(DEBATE_EVENTS.PREP_COUNTDOWN, {
        secondsRemaining: remaining,
      });

      if (remaining <= 0) {
        clearInterval(interval);
        this.countdownIntervals.delete(countdownKey);
      }
    }, 1000);

    this.countdownIntervals.set(countdownKey, interval);

    // Main timer for prep end
    const timer = setTimeout(() => {
      this.handlePrepEnd(roomId);
    }, duration);

    this.prepTimers.set(roomId, timer);
  }

  /**
   * Handle prep phase end
   */
  private async handlePrepEnd(roomId: string) {
    this.clearPrepTimer(roomId);

    try {
      const result = await this.debateRoomsService.startLiveDebate(roomId);

      // Get participant details for DEBATE_STARTED event
      const firstParticipant = await this.prisma.debateParticipant.findFirst({
        where: {
          debateRoomId: roomId,
          userId: result.currentSpeakerId,
        },
        include: {
          user: { select: { id: true, name: true, clerkId: true } },
          team: { select: { side: true } },
        },
      });

      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        select: { turnDurationSeconds: true },
      });

      const state = await this.debateRoomsService.getDebateState(roomId);

      this.server.to(roomId).emit(DEBATE_EVENTS.DEBATE_STARTED, {
        currentSpeakerId: result.currentSpeakerId,
        turnEndTime: result.turnEndTime,
      });

      // Also emit TURN_STARTED for the first speaker
      if (firstParticipant && state) {
        this.server.to(roomId).emit(DEBATE_EVENTS.TURN_STARTED, {
          participantId: firstParticipant.id,
          participantUserId: firstParticipant.user.clerkId,
          participantName: firstParticipant.user.name,
          side: firstParticipant.team.side,
          turnIndex: 0,
          duration: debateRoom?.turnDurationSeconds || 0,
          startedAt: state.turnStartedAt
            ? new Date(state.turnStartedAt).toISOString()
            : new Date().toISOString(),
        });
      }

      // Start turn timer
      this.startTurnTimer(roomId, result.turnEndTime);

      this.logger.log(`Debate ${roomId} started`);
    } catch (error) {
      this.logger.error(`Failed to start debate ${roomId}:`, error);
      this.server.to(roomId).emit(DEBATE_EVENTS.ERROR, {
        message: 'Failed to start debate',
      });
    }
  }

  /**
   * Start turn timer
   */
  private startTurnTimer(roomId: string, turnEndTime: number) {
    this.clearTurnTimer(roomId);

    const now = Date.now();
    const duration = turnEndTime - now;

    if (duration <= 0) {
      this.handleTurnEnd(roomId);
      return;
    }

    // Countdown interval
    const countdownKey = `turn:${roomId}`;
    let remaining = Math.ceil(duration / 1000);

    const interval = setInterval(() => {
      remaining--;
      this.server.to(roomId).emit(DEBATE_EVENTS.TURN_COUNTDOWN, {
        secondsRemaining: remaining,
      });

      if (remaining <= 0) {
        clearInterval(interval);
        this.countdownIntervals.delete(countdownKey);
      }
    }, 1000);

    this.countdownIntervals.set(countdownKey, interval);

    // Main timer for turn end
    const timer = setTimeout(() => {
      this.handleTurnEnd(roomId);
    }, duration);

    this.turnTimers.set(roomId, timer);
  }

  /**
   * Handle turn end (timer expired)
   */
  private async handleTurnEnd(roomId: string) {
    this.clearTurnTimer(roomId);

    try {
      const result = await this.debateRoomsService.advanceToNextTurn(
        roomId,
        'timer',
      );

      if (result.finished) {
        this.handleDebateEnd(roomId);
      } else {
        // Get current and next participant details
        const [currentState, nextParticipant, debateRoom] = await Promise.all([
          this.debateRoomsService.getDebateState(roomId),
          this.prisma.debateParticipant.findFirst({
            where: {
              debateRoomId: roomId,
              userId: result.nextSpeakerId,
            },
            include: {
              user: { select: { id: true, name: true, clerkId: true } },
              team: { select: { side: true } },
            },
          }),
          this.prisma.debateRoom.findUnique({
            where: { id: roomId },
            select: { turnDurationSeconds: true },
          }),
        ]);

        // Emit TURN_ENDED for current speaker if we have their info
        if (currentState?.currentSpeakerId) {
          const currentParticipant =
            await this.prisma.debateParticipant.findFirst({
              where: {
                debateRoomId: roomId,
                userId: currentState.currentSpeakerId,
              },
              include: {
                user: { select: { id: true, name: true, clerkId: true } },
                team: { select: { side: true } },
              },
            });

          if (currentParticipant) {
            this.server.to(roomId).emit(DEBATE_EVENTS.TURN_ENDED, {
              participantId: currentParticipant.id,
              participantUserId: currentParticipant.user.clerkId,
              nextParticipantId: nextParticipant?.id,
              nextParticipantUserId: nextParticipant?.user.clerkId,
              nextSide: nextParticipant?.team.side,
            });

            // Use Clerk ID for mic events
            this.server.to(roomId).emit(DEBATE_EVENTS.MIC_DISABLED, {
              participantId: currentParticipant.user.clerkId,
              reason: 'turn_ended',
            });
          }
        }

        // Emit mic enabled for next speaker
        if (nextParticipant) {
          this.server.to(roomId).emit(DEBATE_EVENTS.MIC_ENABLED, {
            participantId: nextParticipant.user.clerkId,
            reason: 'turn',
          });
        }

        // Emit TURN_STARTED for next speaker
        if (nextParticipant) {
          const state = await this.debateRoomsService.getDebateState(roomId);
          this.server.to(roomId).emit(DEBATE_EVENTS.TURN_STARTED, {
            participantId: nextParticipant.id,
            participantUserId: nextParticipant.user.clerkId,
            participantName: nextParticipant.user.name,
            side: nextParticipant.team.side,
            turnIndex: result.turnNumber || 0,
            duration: debateRoom?.turnDurationSeconds || 0,
            startedAt: state?.turnStartedAt
              ? new Date(state.turnStartedAt).toISOString()
              : new Date().toISOString(),
          });
        }

        // Start new turn timer
        this.startTurnTimer(roomId, result.turnEndTime!);
      }
    } catch (error) {
      this.logger.error(`Failed to advance turn in debate ${roomId}:`, error);
    }
  }

  /**
   * Handle debate end
   */
  private async handleDebateEnd(roomId: string) {
    this.clearTurnTimer(roomId);
    this.clearPrepTimer(roomId);

    // Emit mic disabled for all participants
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: { include: { user: true } },
        moderators: { include: { user: true } },
      },
    });

    if (debateRoom) {
      // Emit mic disabled for all participants
      for (const participant of debateRoom.participants) {
        this.server.to(roomId).emit(DEBATE_EVENTS.MIC_DISABLED, {
          participantId: participant.user.clerkId,
          reason: 'debate_ended',
        });
      }

      // Emit mic enabled for moderators
      for (const moderator of debateRoom.moderators) {
        this.server.to(roomId).emit(DEBATE_EVENTS.MIC_ENABLED, {
          participantId: moderator.user.clerkId,
          reason: 'moderator',
        });
      }
    }

    this.server.to(roomId).emit(DEBATE_EVENTS.DEBATE_ENDED, {
      message: 'All turns completed. Moderators can now generate results.',
    });

    this.logger.log(`Debate ${roomId} ended`);
  }

  /**
   * Clear prep timer
   */
  private clearPrepTimer(roomId: string) {
    const timer = this.prepTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.prepTimers.delete(roomId);
    }

    const countdownKey = `prep:${roomId}`;
    const interval = this.countdownIntervals.get(countdownKey);
    if (interval) {
      clearInterval(interval);
      this.countdownIntervals.delete(countdownKey);
    }
  }

  /**
   * Clear turn timer
   */
  private clearTurnTimer(roomId: string) {
    const timer = this.turnTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(roomId);
    }

    const countdownKey = `turn:${roomId}`;
    const interval = this.countdownIntervals.get(countdownKey);
    if (interval) {
      clearInterval(interval);
      this.countdownIntervals.delete(countdownKey);
    }
  }
}
