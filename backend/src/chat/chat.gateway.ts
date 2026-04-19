import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { createClerkClient } from '@clerk/backend';
import { PermissionsService } from '../session-moderation/permissions.service';
import { MessageAudienceType } from '../generated/prisma';
import { corsOriginDelegate } from '../common/cors';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  /** Map of dbUserId → set of connected socket IDs (a user may have multiple tabs). */
  private readonly onlineUsers = new Map<string, Set<string>>();

  @WebSocketServer()
  server!: Server;

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(
    private chatService: ChatService,
    private permissionsService: PermissionsService,
    private usersService: UsersService,
  ) {}

  private normalizeAudienceType(
    audienceType?: MessageAudienceType,
  ): MessageAudienceType {
    if (!audienceType) return MessageAudienceType.EVERYONE;
    if (Object.values(MessageAudienceType).includes(audienceType)) {
      return audienceType;
    }
    return MessageAudienceType.EVERYONE;
  }

  /** Full payload for clients; partial emits produced empty text / invalid dates in the UI. */
  private serializeMessageForSocket(message: {
    id: string;
    channelId: string;
    senderId: string | null;
    guestSenderId: string | null;
    guestEmail: string | null;
    content: string;
    audienceType: MessageAudienceType;
    targetUserId: string | null;
    createdAt: Date;
    sender: { id: string; name: string; avatar: string | null } | null;
    targetUser: { id: string; name: string; avatar: string | null } | null;
  }) {
    return {
      id: message.id,
      channelId: message.channelId,
      senderId: message.senderId,
      guestSenderId: message.guestSenderId,
      guestEmail: message.guestEmail,
      content: message.content,
      audienceType: message.audienceType,
      targetUserId: message.targetUserId,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
      targetUser: message.targetUser,
    };
  }

  /**
   * Prisma / JSON may surface audience as enum or string; strict `=== EVERYONE` can miss and
   * fall through to the recipient branch. Guest sends have `senderId: null` — if EVERYONE was
   * misclassified, `recipients` is empty and **no** `message:new` fires (host never sees joinee).
   */
  private isEveryoneAudience(
    audienceType: MessageAudienceType | string | undefined | null,
  ): boolean {
    if (audienceType == null) return true;
    if (audienceType === MessageAudienceType.EVERYONE) return true;
    return String(audienceType).toUpperCase() === 'EVERYONE';
  }

  private async emitScopedMessage(
    channelId: string,
    message: {
      audienceType: MessageAudienceType;
      senderId: string | null;
      guestSenderId?: string | null;
      targetUserId?: string | null;
    },
  ) {
    if (this.isEveryoneAudience(message.audienceType)) {
      // Single broadcast to the channel room — all sockets (host, participants, guests)
      // joined via join:channel receive once. Do not also emit per user:${dbId}: senders
      // are in both rooms and would see every message twice.
      this.server.to(channelId).emit('message:new', message);
      return;
    }

    const recipients = new Set<string>();
    if (message.senderId) {
      recipients.add(message.senderId);
    }
    if (message.targetUserId) {
      recipients.add(message.targetUserId);
    }

    if (recipients.size === 0) {
      this.logger.warn(
        `emitScopedMessage: no recipients for scoped message (audience=${String(message.audienceType)}); broadcasting to channel ${channelId} as fallback`,
      );
      this.server.to(channelId).emit('message:new', message);
      return;
    }

    for (const userId of recipients) {
      this.server.to(`user:${userId}`).emit('message:new', message);
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        this.logger.debug('No token provided in WebSocket handshake');
        client.disconnect();
        return;
      }

      // Verify token directly with Clerk (for WebSocket, we can't use authenticateRequest)
      try {
        // Use environment variable or construct from PORT
        const baseUrl =
          process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
        const clerkRequest = new Request(baseUrl, {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        const requestState = await this.clerkClient.authenticateRequest(
          clerkRequest,
          {
            jwtKey: process.env.CLERK_JWT_KEY,
          },
        );

        if (!requestState.isSignedIn) {
          // Not a valid Clerk token, try guest token path before disconnecting
          const guestRecord = await this.chatService.validateGuestToken(token).catch(() => null);
          if (guestRecord) {
            client.data.isGuest = true;
            client.data.guestName = guestRecord.guestParticipant.name;
            client.data.guestIdentity =
              guestRecord.guestParticipant.livekitIdentity;
            client.data.guestParticipantId = guestRecord.guestParticipant.id;
            client.data.guestEmail = guestRecord.guestParticipant.email;
            client.data.studyRoomId = guestRecord.studyRoomId;
            client.emit('chat:authenticated');
            return;
          }
          this.logger.debug('User is not authenticated');
          client.disconnect();
          return;
        }

        const auth = requestState.toAuth();

        if (!auth.userId) {
          this.logger.debug('User ID not found in token');
          client.disconnect();
          return;
        }

        client.data.userId = auth.userId;
        client.data.clerkId = auth.userId;

        const user = await this.usersService.ensureUserFromClerk(auth.userId);

        client.data.dbUserId = user.id;
        client.join(`user:${user.id}`);
        this.addToPresence(user.id, client.id);
        client.emit('chat:authenticated');
        this.logger.debug('WebSocket authenticated for user:', auth.userId);
      } catch (verifyError: any) {
        // Clerk auth failed, try guest token path
        const guestRecord = await this.chatService.validateGuestToken(token).catch(() => null);
        if (guestRecord) {
          client.data.isGuest = true;
          client.data.guestName = guestRecord.guestParticipant.name;
          client.data.guestIdentity =
            guestRecord.guestParticipant.livekitIdentity;
          client.data.guestParticipantId = guestRecord.guestParticipant.id;
          client.data.guestEmail = guestRecord.guestParticipant.email;
          client.data.studyRoomId = guestRecord.studyRoomId;
          client.emit('chat:authenticated');
          return;
        }
        this.logger.debug(
          'Token verification failed:',
          verifyError.message || verifyError,
        );
        client.disconnect();
        return;
      }
    } catch (error) {
      this.logger.debug('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const dbUserId = client.data.dbUserId as string | undefined;
    if (dbUserId) {
      this.removeFromPresence(dbUserId, client.id);
    }
  }

  // ─── Presence helpers ──────────────────────────────────────────────

  private addToPresence(dbUserId: string, socketId: string) {
    let sockets = this.onlineUsers.get(dbUserId);
    if (!sockets) {
      sockets = new Set();
      this.onlineUsers.set(dbUserId, sockets);
    }
    sockets.add(socketId);
    // Broadcast to ALL connected sockets so conversation lists update
    this.server.emit('presence:update', {
      userId: dbUserId,
      status: 'online',
    });
  }

  private removeFromPresence(dbUserId: string, socketId: string) {
    const sockets = this.onlineUsers.get(dbUserId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.onlineUsers.delete(dbUserId);
      this.server.emit('presence:update', {
        userId: dbUserId,
        status: 'offline',
      });
    }
  }

  @SubscribeMessage('presence:query')
  handlePresenceQuery(client: Socket) {
    const onlineIds = Array.from(this.onlineUsers.keys());
    client.emit('presence:list', { onlineUserIds: onlineIds });
  }

  @SubscribeMessage('join:channel')
  async handleJoinChannel(client: Socket, payload: { channelId: string }) {
    // Guest path: allow join if the channel belongs to the guest's study room
    if (client.data.isGuest) {
      const sessionInfo = await this.chatService.getSessionInfoFromChannelId(
        payload.channelId,
      );
      if (sessionInfo?.externalType === 'studyRoom') {
        const channelRoomId = await this.chatService.canonicalStudyRoomId(
          sessionInfo.externalId,
        );
        const tokenRoomId = await this.chatService.canonicalStudyRoomId(
          client.data.studyRoomId as string,
        );
        if (
          channelRoomId &&
          tokenRoomId &&
          channelRoomId === tokenRoomId
        ) {
          client.join(payload.channelId);
          client.emit('chat:joined', { channelId: payload.channelId });
        } else {
          this.logger.warn(
            `Guest join:channel room mismatch channelExt=${sessionInfo.externalId} tokenStudyRoom=${String(client.data.studyRoomId)} resolvedChannel=${channelRoomId} resolvedToken=${tokenRoomId}`,
          );
          client.emit('chat:error', {
            message: 'Not authorized to join this channel',
          });
        }
      } else {
        client.emit('chat:error', { message: 'Not authorized to join this channel' });
      }
      return;
    }

    if (!client.data.userId || !client.data.dbUserId) {
      client.emit('chat:error', { message: 'Not authenticated' });
      return;
    }

    const isMember = await this.chatService.isChannelMember(
      payload.channelId,
      client.data.dbUserId,
    );
    if (!isMember) {
      const sessionInfo = await this.chatService.getSessionInfoFromChannelId(payload.channelId);
      if (sessionInfo?.externalType === 'studyRoom' || sessionInfo?.externalType === 'peerSession') {
        try {
          await this.chatService.addMember(payload.channelId, client.data.dbUserId);
          client.join(payload.channelId);
          client.emit('chat:joined', { channelId: payload.channelId });
          return;
        } catch (error) {
          this.logger.debug('Failed to auto-add chat member:', error);
        }
      }
      client.emit('chat:error', {
        code: 'NOT_CHANNEL_MEMBER',
        message: 'Not a member of this channel',
      });
      return;
    }

    client.join(payload.channelId);
    client.emit('chat:joined', { channelId: payload.channelId });
  }

  @SubscribeMessage('message:send')
  async handleMessageSend(
    client: Socket,
    payload: {
      channelId: string;
      content: string;
      audienceType?: MessageAudienceType;
      targetUserId?: string;
    },
  ) {
    // Guest path: same visibility rules as signed-in users; EVERYONE → channel broadcast (all participants)
    if (client.data.isGuest) {
      try {
        const sessionInfo = await this.chatService.getSessionInfoFromChannelId(
          payload.channelId,
        );
        const audienceType = this.normalizeAudienceType(payload.audienceType);
        const guestPermKey = client.data.guestIdentity as string;

        if (sessionInfo && guestPermKey) {
          const canChat = await this.permissionsService.hasPermission(
            sessionInfo.externalId,
            guestPermKey,
            'chat',
            false,
          );
          if (!canChat) {
            client.emit('chat:error', {
              code: 'CHAT_DISABLED',
              message: 'Chat is disabled by the host',
            });
            return;
          }

          const canSendToAudience =
            await this.permissionsService.hasAudiencePermission(
              sessionInfo.externalId,
              guestPermKey,
              audienceType,
              false,
            );
          if (!canSendToAudience) {
            client.emit('chat:error', {
              code: 'CHAT_SCOPE_RESTRICTED',
              message: 'The host has restricted this chat target for you',
            });
            return;
          }
        }

        const hostDbUserId = await this.chatService.getChannelHostUserId(
          payload.channelId,
        );
        if (
          audienceType === MessageAudienceType.HOST &&
          !hostDbUserId
        ) {
          client.emit('chat:error', { message: 'Host not found for this channel' });
          return;
        }

        const message = await this.chatService.sendGuestMessage(
          payload.channelId,
          client.data.guestParticipantId,
          client.data.guestEmail,
          client.data.guestName,
          payload.content,
          audienceType,
          audienceType === MessageAudienceType.HOST ? hostDbUserId : payload.targetUserId,
        );

        const base = this.serializeMessageForSocket({
          ...message,
          guestSenderId: message.guestSenderId,
          guestEmail: message.guestEmail ?? client.data.guestEmail,
          sender:
            message.sender || {
              id: client.data.guestParticipantId || client.data.guestIdentity || 'guest',
              name: client.data.guestName || 'Guest',
              avatar: null,
            },
        });

        const messageToEmit = { ...base, isGuest: true };

        await this.emitScopedMessage(payload.channelId, messageToEmit);

        // Guests are not in user:{dbId} rooms; echo non-EVERYONE sends here (EVERYONE already hits channel room)
        if (audienceType !== MessageAudienceType.EVERYONE) {
          client.emit('message:new', messageToEmit);
        }
      } catch (error: any) {
        this.logger.debug('Error sending guest message:', error);
        client.emit('chat:error', { message: error.message || 'Failed to send message' });
      }
      return;
    }

    if (!client.data.userId || !client.data.dbUserId) {
      client.emit('chat:error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Get session info from channel to check chat permissions
      const sessionInfo = await this.chatService.getSessionInfoFromChannelId(
        payload.channelId,
      );
      const hostDbUserId = sessionInfo
        ? await this.chatService.getChannelHostUserId(payload.channelId)
        : null;
      const isHostSender = !!hostDbUserId && hostDbUserId === client.data.dbUserId;

      if (sessionInfo) {
        // Check if user has chat permission for this session
        const canChat = await this.permissionsService.hasPermission(
          sessionInfo.externalId,
          client.data.userId,
          'chat',
          isHostSender,
        );

        if (!canChat) {
          client.emit('chat:error', {
            code: 'CHAT_DISABLED',
            message: 'Chat is disabled by the host',
          });
          return;
        }
      }

      const audienceType = this.normalizeAudienceType(payload.audienceType);

      if (sessionInfo) {
        const canSendToAudience =
          await this.permissionsService.hasAudiencePermission(
            sessionInfo.externalId,
            client.data.userId,
            audienceType,
            isHostSender,
          );
        if (!canSendToAudience) {
          client.emit('chat:error', {
            code: 'CHAT_SCOPE_RESTRICTED',
            message: 'The host has restricted this chat target for you',
          });
          return;
        }
      }

      const message = await this.chatService.sendMessage(
        payload.channelId,
        client.data.dbUserId,
        payload.content,
        audienceType,
        payload.targetUserId,
      );
      const toEmit = this.serializeMessageForSocket(message);
      await this.emitScopedMessage(payload.channelId, toEmit);
    } catch (error: any) {
      this.logger.debug('Error sending message:', error);
      client.emit('chat:error', {
        message: error.message || 'Failed to send message',
      });
    }
  }
}
