import {} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createClerkClient } from '@clerk/backend';
import { StudyRoomsService } from '../study-rooms/study-rooms.service';
import { PeerSessionsService } from '../peer-sessions/peer-sessions.service';
import { PermissionsService, FlashQuestion } from './permissions.service';
import { LoggerService } from '../common/logger';
import { PrismaService } from '../prisma/prisma.service';
import { corsOriginDelegate } from '../common/cors';

@WebSocketGateway({
  namespace: '/session-moderation',
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
})
export class SessionModerationGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit
{
  private static readonly GUEST_SOCKET_TOKEN_GRACE_MS =
    24 * 60 * 60 * 1000;
  @WebSocketServer()
  server!: Server;

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(
    private studyRoomsService: StudyRoomsService,
    private peerSessionsService: PeerSessionsService,
    private permissionsService: PermissionsService,
    private prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(SessionModerationGateway.name);
  }

  /**
   * Auth must complete in Socket.IO middleware before the client receives `connect`.
   * Otherwise the client emits `join-session` immediately and races async `handleConnection`,
   * producing `Not authenticated` and no host mic/camera notifications for joinees.
   */
  afterInit(server: Server) {
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        await this.authenticateModerationSocket(socket);
        next();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Authentication failed';
        this.logger.warn(`Session moderation auth rejected: ${message}`);
        next(err instanceof Error ? err : new Error(message));
      }
    });
  }

  private async authenticateModerationSocket(client: Socket): Promise<void> {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new Error('No token provided in WebSocket handshake');
    }

    try {
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
        { jwtKey: process.env.CLERK_JWT_KEY },
      );

      if (!requestState.isSignedIn) {
        const guestAccess =
          await this.prisma.studyRoomGuestAccessToken.findUnique({
            where: { token },
            include: {
              guestParticipant: true,
              studyRoom: { select: { sessionMode: true } },
            },
          });
        const expiredByMs = guestAccess
          ? Date.now() - guestAccess.expiresAt.getTime()
          : Number.POSITIVE_INFINITY;
        if (
          !guestAccess ||
          expiredByMs > SessionModerationGateway.GUEST_SOCKET_TOKEN_GRACE_MS
        ) {
          throw new Error('User is not authenticated');
        }
        client.data.userId = guestAccess.guestParticipant.livekitIdentity;
        client.data.guest = true;
        return;
      }

      const auth = requestState.toAuth();
      if (!auth.userId) {
        throw new Error('User ID not found in token');
      }

      client.data.userId = auth.userId;
    } catch (verifyError: unknown) {
      const guestAccess =
        await this.prisma.studyRoomGuestAccessToken.findUnique({
          where: { token },
          include: {
            guestParticipant: true,
            studyRoom: { select: { sessionMode: true } },
          },
        });
      const expiredByMs = guestAccess
        ? Date.now() - guestAccess.expiresAt.getTime()
        : Number.POSITIVE_INFINITY;
      if (
        !guestAccess ||
        expiredByMs > SessionModerationGateway.GUEST_SOCKET_TOKEN_GRACE_MS
      ) {
        const msg =
          verifyError instanceof Error
            ? verifyError.message
            : String(verifyError);
        throw new Error(msg || 'Token verification failed');
      }
      client.data.userId = guestAccess.guestParticipant.livekitIdentity;
      client.data.guest = true;
    }
  }

  async handleConnection(client: Socket) {
    const userId = client.data?.userId ?? 'unknown';
    const guest = client.data?.guest ? ' (guest)' : '';
    this.logger.log(
      `🔌 Session Moderation Socket connected - User: ${userId}${guest}, Client: ${client.id}`,
    );
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId || 'unknown';
    this.logger.log(
      `🔌 Session Moderation Socket disconnected - User: ${userId}, Client: ${client.id}`,
    );
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    client: Socket,
    payload: { sessionId: string; sessionType?: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType } = payload;
    if (!sessionId) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    // Store session info on the client
    client.data.sessionId = sessionId;
    client.data.sessionType = sessionType;
    client.join(sessionId);

    // Check if user is host FIRST (before fetching permissions)
    let isHost = false;
    if (sessionType) {
      try {
        isHost = await this.verifyIsHost(
          sessionId,
          sessionType,
          client.data.userId,
        );
      } catch (e) {
        // Non-critical error, user is not host
      }
    }

    // Store host status on client
    client.data.isHost = isHost;

    // Fetch computed permissions from Redis for this user
    // Pass isHost so hosts always get full permissions
    const computedPerms = await this.permissionsService.getComputedPermissions(
      sessionId,
      client.data.userId,
      isHost,
    );
    const roomSettings =
      await this.permissionsService.getRoomSettings(sessionId);

    // Emit sync-permissions with computed permissions for this user
    client.emit('sync-permissions', {
      sessionId,
      permissions: computedPerms,
      roomSettings: {
        lockAudio: roomSettings.lockAudio,
        lockVideo: roomSettings.lockVideo,
        chatDisabled: roomSettings.chatDisabled,
        hideParticipantList: roomSettings.hideParticipantList,
        chatRestrictToHostOnly: roomSettings.chatRestrictToHostOnly,
        lockScratchPad: roomSettings.lockScratchPad,
      },
      isHost,
    });

    // Also emit moderation-joined for backwards compatibility
    client.emit('moderation-joined', {
      sessionId,
      permissions: computedPerms,
    });

    this.logger.debug(
      `User ${client.data.userId} joined session ${sessionId} with permissions:`,
      computedPerms,
    );
  }

  // Host updates room-wide permissions (Lock system)
  @SubscribeMessage('update-permissions')
  async handleUpdatePermissions(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      permissions: {
        allowAudio?: boolean;
        allowVideo?: boolean;
        allowChat?: boolean;
        allowChatEveryone?: boolean;
        allowChatHost?: boolean;
        allowChatUser?: boolean;
        allowParticipantList?: boolean;
        restrictChatToHostOnly?: boolean;
        allowScratchPad?: boolean;
      };
      targetUserId?: string; // If set, only update this user's permissions
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, permissions, targetUserId } = payload;
    if (!sessionId || !sessionType) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify the caller is the host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only the host can update permissions',
        });
        return;
      }

      if (targetUserId) {
        // Update per-user override in Redis
        const userPerms: {
          canAudio?: boolean;
          canVideo?: boolean;
          canChat?: boolean;
          canChatEveryone?: boolean;
          canChatHost?: boolean;
          canChatUser?: boolean;
        } = {};
        if (permissions.allowAudio !== undefined)
          userPerms.canAudio = permissions.allowAudio;
        if (permissions.allowVideo !== undefined)
          userPerms.canVideo = permissions.allowVideo;
        if (permissions.allowChat !== undefined)
          userPerms.canChat = permissions.allowChat;
        if (permissions.allowChatEveryone !== undefined) {
          userPerms.canChatEveryone = permissions.allowChatEveryone;
        }
        if (permissions.allowChatHost !== undefined) {
          userPerms.canChatHost = permissions.allowChatHost;
        }
        if (permissions.allowChatUser !== undefined) {
          userPerms.canChatUser = permissions.allowChatUser;
        }

        await this.permissionsService.setUserPermissions(
          sessionId,
          targetUserId,
          userPerms,
        );

        // Get updated computed permissions for the target user
        const computedPerms =
          await this.permissionsService.getComputedPermissions(
            sessionId,
            targetUserId,
          );

        // Notify the specific user and all clients in the room
        this.server.to(sessionId).emit('permissions-updated', {
          targetUserId,
          permissions: computedPerms,
        });

        // Emit user-state-changed for UI updates
        this.server.to(sessionId).emit('user-state-changed', {
          userId: targetUserId,
          permissions: computedPerms,
        });
      } else {
        // Update room-wide settings in Redis
        const roomSettings: {
          lockAudio?: boolean;
          lockVideo?: boolean;
          chatDisabled?: boolean;
          hideParticipantList?: boolean;
          chatRestrictToHostOnly?: boolean;
          lockScratchPad?: boolean;
        } = {};
        if (permissions.allowAudio !== undefined)
          roomSettings.lockAudio = !permissions.allowAudio;
        if (permissions.allowVideo !== undefined)
          roomSettings.lockVideo = !permissions.allowVideo;
        if (permissions.allowChat !== undefined)
          roomSettings.chatDisabled = !permissions.allowChat;
        if (permissions.allowParticipantList !== undefined) {
          roomSettings.hideParticipantList = !permissions.allowParticipantList;
        }
        if (permissions.restrictChatToHostOnly !== undefined) {
          roomSettings.chatRestrictToHostOnly =
            permissions.restrictChatToHostOnly;
        }
        if (permissions.allowScratchPad !== undefined) {
          roomSettings.lockScratchPad = !permissions.allowScratchPad;
        }

        await this.permissionsService.setRoomSettings(sessionId, roomSettings);

        // Get updated settings
        const updatedSettings =
          await this.permissionsService.getRoomSettings(sessionId);

        // Recompute permissions for all users in the room and broadcast
        const allClients = await this.server.in(sessionId).fetchSockets();

        for (const socket of allClients) {
          if (socket.data.userId) {
            const socketIsHost = await this.verifyIsHost(
              sessionId,
              sessionType,
              socket.data.userId,
            );
            const computedPerms =
              await this.permissionsService.getComputedPermissions(
                sessionId,
                socket.data.userId,
                socketIsHost,
              );

            // Emit to specific user with their computed permissions
            socket.emit('permissions-updated', {
              permissions: computedPerms,
            });
          }
        }

        // Also broadcast room-wide update with general permissions (for backwards compatibility)
        this.server.to(sessionId).emit('permissions-updated', {
          permissions: {
            allowAudio: !updatedSettings.lockAudio,
            allowVideo: !updatedSettings.lockVideo,
            allowChat: !updatedSettings.chatDisabled,
            allowParticipantList: !updatedSettings.hideParticipantList,
            allowScratchPad: !updatedSettings.lockScratchPad,
          },
        });

        // Also emit room-settings-updated for new frontend
        this.server.to(sessionId).emit('room-settings-updated', {
          settings: updatedSettings,
        });
      }

      client.emit('update-permissions:ok', { message: 'Permissions updated' });
    } catch (error: any) {
      this.logger.error('Error updating permissions:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to update permissions',
      });
    }
  }

  // Get current permissions for a user (called when they try to unmute/enable video)
  @SubscribeMessage('check-permission')
  async handleCheckPermission(
    client: Socket,
    payload: { sessionId: string; type: 'audio' | 'video' | 'chat' },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, type } = payload;
    if (!sessionId || !type) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    const allowed = await this.permissionsService.hasPermission(
      sessionId,
      client.data.userId,
      type,
    );
    client.emit('permission-check-result', { type, allowed });
  }

  // Host requests end meeting for all
  @SubscribeMessage('end-meeting')
  async handleEndMeeting(
    client: Socket,
    payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType } = payload;
    if (!sessionId || !sessionType) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const clerkId = client.data.userId;
      const startTime = Date.now();

      // 1. BROADCAST IMMEDIATELY for 1s response time goal
      this.server
        .to(sessionId)
        .emit('meeting-ended', { sessionId, sessionType, endedBy: clerkId });

      client.emit('end-meeting:ok', { message: 'Meeting ended' });

      this.logger.log(`⚡ [handleEndMeeting] Initial events emitted in ${Date.now() - startTime}ms`);

      // 2. Background all service calls and cleanup (non-awaited)
      (async () => {
        try {
          this.logger.debug(`🚀 [handleEndMeeting] Starting background cleanup for ${sessionId}`);
          
          if (sessionType === 'studyRoom') {
            const roomDetails = await this.studyRoomsService.getStudyRoomDetails(sessionId);
            if (
              roomDetails.sessionStatus !== 'DONE' &&
              roomDetails.sessionStatus !== 'NOT_COMPLETED' &&
              roomDetails.sessionStatus !== 'CANCELLED'
            ) {
              await this.studyRoomsService.completeStudyRoom(sessionId, clerkId);
            }
          } else {
            const sessionDetails = await this.peerSessionsService.getPeerSessionDetails(sessionId);
            if (
              sessionDetails.sessionStatus !== 'DONE' &&
              sessionDetails.sessionStatus !== 'NOT_COMPLETED' &&
              sessionDetails.sessionStatus !== 'CANCELLED'
            ) {
              await this.peerSessionsService.completePeerSession(sessionId, clerkId);
            }
          }

          // Cleanup Redis permissions for this session
          await this.permissionsService.cleanupSession(sessionId);
          this.logger.log(`✅ [handleEndMeeting] Background cleanup completed for ${sessionId} in ${Date.now() - startTime}ms`);
        } catch (bgError) {
          this.logger.error(`❌ [handleEndMeeting] Background cleanup failed for ${sessionId}:`, bgError);
        }
      })();
    } catch (error: any) {
      this.logger.error('Error ending meeting:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to end meeting',
      });
    }
  }

  // Helper to verify if a user is the host of a session
  private async verifyIsHost(
    sessionId: string,
    sessionType: 'studyRoom' | 'peerSession',
    clerkId: string,
  ): Promise<boolean> {
    try {
      if (sessionType === 'studyRoom') {
        const result = await this.studyRoomsService.checkIsHost(
          sessionId,
          undefined,
          clerkId,
        );
        return result.isHost;
      } else {
        const result = await this.peerSessionsService.checkIsHost(
          sessionId,
          clerkId,
        );
        return result.isHost;
      }
    } catch (error) {
      this.logger.error('Error verifying host status:', error);
      return false;
    }
  }

  // Moderation actions (mute/unmute, video enable/disable)
  @SubscribeMessage('moderation-mute')
  async handleModerationMute(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      action: 'mute' | 'unmute';
      targetUserId?: string;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, action, targetUserId } = payload;
    if (!sessionId || !sessionType || !action) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify the caller is the host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only the host can perform moderation actions',
        });
        return;
      }

      // If muting a specific user, also lock their audio permission in Redis
      if (action === 'mute' && targetUserId) {
        await this.permissionsService.setUserPermissions(
          sessionId,
          targetUserId,
          { canAudio: false },
        );
        this.logger.debug(
          `Locked audio for user ${targetUserId} in session ${sessionId}`,
        );
      }

      // Broadcast to session room; clients will check targetUserId
      // Include hostClerkId so frontend knows NOT to apply mute to the host
      this.server.to(sessionId).emit('moderation-mute', {
        action,
        targetUserId,
        hostClerkId: client.data.userId, // Host should be excluded from mute all
        isLocked: action === 'mute' && !!targetUserId, // Indicate if this is a lock action
      });
      client.emit('moderation-mute:ok', { message: 'Moderation action sent' });
    } catch (error: any) {
      this.logger.error('Error broadcasting moderation-mute:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to perform moderation',
      });
    }
  }

  @SubscribeMessage('moderation-video')
  async handleModerationVideo(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      action: 'disable' | 'enable';
      targetUserId?: string;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, action, targetUserId } = payload;
    if (!sessionId || !sessionType || !action) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify the caller is the host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only the host can perform moderation actions',
        });
        return;
      }

      // If disabling video for a specific user, also lock their video permission in Redis
      if (action === 'disable' && targetUserId) {
        await this.permissionsService.setUserPermissions(
          sessionId,
          targetUserId,
          { canVideo: false },
        );
        this.logger.debug(
          `Locked video for user ${targetUserId} in session ${sessionId}`,
        );
      }

      // Include hostClerkId so frontend knows NOT to apply video disable to the host
      this.server.to(sessionId).emit('moderation-video', {
        action,
        targetUserId,
        hostClerkId: client.data.userId, // Host should be excluded from video disable all
        isLocked: action === 'disable' && !!targetUserId, // Indicate if this is a lock action
      });
      client.emit('moderation-video:ok', {
        message: 'Moderation video action sent',
      });
    } catch (error: any) {
      this.logger.error('Error broadcasting moderation-video:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to perform moderation',
      });
    }
  }

  // Host requests participant to turn on audio (cannot force due to browser privacy)
  @SubscribeMessage('request-audio-on')
  async handleRequestAudioOn(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      targetUserId: string;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, targetUserId } = payload;
    if (!sessionId || !sessionType || !targetUserId) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify the caller is the host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only the host can request audio on',
        });
        return;
      }

      // Unlock audio for this participant in Redis so they can unmute if they accept
      // (room defaults may have mic disabled; JWT/moderation need allowAudio true when host asks)
      await this.permissionsService.setUserPermissions(sessionId, targetUserId, {
        canAudio: true,
      });
      const audioComputed =
        await this.permissionsService.getComputedPermissions(
          sessionId,
          targetUserId,
          false,
        );
      this.server.to(sessionId).emit('user-permissions-updated', {
        targetUserId,
        permissions: audioComputed,
      });

      // Broadcast request to the specific user
      this.server.to(sessionId).emit('host-requested-audio', {
        targetUserId,
        hostId: client.data.userId,
      });
      // Confirm to host that request was sent
      client.emit('request-sent-confirmation', { type: 'audio', targetUserId });
      this.logger.debug(
        `Host ${client.data.userId} requested audio on for ${targetUserId}`,
      );
    } catch (error: any) {
      this.logger.error('Error requesting audio on:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to request audio',
      });
    }
  }

  // Host requests participant to turn on video (cannot force due to browser privacy)
  @SubscribeMessage('request-video-on')
  async handleRequestVideoOn(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      targetUserId: string;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, targetUserId } = payload;
    if (!sessionId || !sessionType || !targetUserId) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify the caller is the host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only the host can request video on',
        });
        return;
      }

      await this.permissionsService.setUserPermissions(sessionId, targetUserId, {
        canVideo: true,
      });
      const videoComputed =
        await this.permissionsService.getComputedPermissions(
          sessionId,
          targetUserId,
          false,
        );
      this.server.to(sessionId).emit('user-permissions-updated', {
        targetUserId,
        permissions: videoComputed,
      });

      // Broadcast request to the specific user
      this.server.to(sessionId).emit('host-requested-video', {
        targetUserId,
        hostId: client.data.userId,
      });
      // Confirm to host that request was sent
      client.emit('request-sent-confirmation', { type: 'video', targetUserId });
      this.logger.debug(
        `Host ${client.data.userId} requested video on for ${targetUserId}`,
      );
    } catch (error: any) {
      this.logger.error('Error requesting video on:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to request video',
      });
    }
  }

  // User responds to host's audio request (accept/deny)
  @SubscribeMessage('respond-audio-request')
  async handleRespondAudioRequest(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      accepted: boolean;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, accepted } = payload;
    if (!sessionId || !sessionType || typeof accepted !== 'boolean') {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      if (accepted) {
        await this.permissionsService.setUserPermissions(
          sessionId,
          client.data.userId,
          { canAudio: true },
        );
        this.logger.debug(
          `User ${client.data.userId} accepted audio request, unlocked audio`,
        );
      } else {
        await this.permissionsService.removeUserPermissionFields(
          sessionId,
          client.data.userId,
          ['canAudio'],
        );
      }

      const audioRespondComputed =
        await this.permissionsService.getComputedPermissions(
          sessionId,
          client.data.userId,
          false,
        );
      this.server.to(sessionId).emit('user-permissions-updated', {
        targetUserId: client.data.userId,
        permissions: audioRespondComputed,
      });

      // Notify the host about the response
      this.server.to(sessionId).emit('audio-request-response', {
        userId: client.data.userId,
        accepted,
      });
      client.emit('respond-audio-request:ok', { message: 'Response sent' });
    } catch (error: any) {
      this.logger.error('Error responding to audio request:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to respond',
      });
    }
  }

  // User responds to host's video request (accept/deny)
  @SubscribeMessage('respond-video-request')
  async handleRespondVideoRequest(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      accepted: boolean;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, accepted } = payload;
    if (!sessionId || !sessionType || typeof accepted !== 'boolean') {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      if (accepted) {
        await this.permissionsService.setUserPermissions(
          sessionId,
          client.data.userId,
          { canVideo: true },
        );
        this.logger.debug(
          `User ${client.data.userId} accepted video request, unlocked video`,
        );
      } else {
        await this.permissionsService.removeUserPermissionFields(
          sessionId,
          client.data.userId,
          ['canVideo'],
        );
      }

      const videoRespondComputed =
        await this.permissionsService.getComputedPermissions(
          sessionId,
          client.data.userId,
          false,
        );
      this.server.to(sessionId).emit('user-permissions-updated', {
        targetUserId: client.data.userId,
        permissions: videoRespondComputed,
      });

      // Notify the host about the response
      this.server.to(sessionId).emit('video-request-response', {
        userId: client.data.userId,
        accepted,
      });
      client.emit('respond-video-request:ok', { message: 'Response sent' });
    } catch (error: any) {
      this.logger.error('Error responding to video request:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to respond',
      });
    }
  }

  // Participant requests permission to unmute audio
  @SubscribeMessage('participant-request-audio')
  async handleParticipantRequestAudio(
    client: Socket,
    payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType } = payload;
    if (!sessionId || !sessionType) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Broadcast to host (entire room) that participant is requesting audio
      this.server.to(sessionId).emit('participant-requested-audio', {
        userId: client.data.userId,
        requestType: 'audio',
      });
      client.emit('participant-request-audio:ok', {
        message: 'Request sent to host',
      });
      this.logger.debug(
        `Participant ${client.data.userId} requested audio permission`,
      );
    } catch (error: any) {
      this.logger.error('Error sending participant audio request:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to send request',
      });
    }
  }

  // Participant requests permission to enable video
  @SubscribeMessage('participant-request-video')
  async handleParticipantRequestVideo(
    client: Socket,
    payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType } = payload;
    if (!sessionId || !sessionType) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Broadcast to host (entire room) that participant is requesting video
      this.server.to(sessionId).emit('participant-requested-video', {
        userId: client.data.userId,
        requestType: 'video',
      });
      client.emit('participant-request-video:ok', {
        message: 'Request sent to host',
      });
      this.logger.debug(
        `Participant ${client.data.userId} requested video permission`,
      );
    } catch (error: any) {
      this.logger.error('Error sending participant video request:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to send request',
      });
    }
  }

  // Host responds to participant's audio request
  @SubscribeMessage('host-respond-participant-audio')
  async handleHostRespondParticipantAudio(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      userId: string;
      accepted: boolean;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, userId, accepted } = payload;
    if (
      !sessionId ||
      !sessionType ||
      !userId ||
      typeof accepted !== 'boolean'
    ) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify caller is host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only host can respond to permission requests',
        });
        return;
      }

      if (accepted) {
        // Unlock audio permission for the participant
        await this.permissionsService.setUserPermissions(sessionId, userId, {
          canAudio: true,
        });
        this.logger.debug(
          `Host ${client.data.userId} accepted audio request from ${userId}`,
        );

        // Emit user-permissions-updated so the participant's frontend updates their permissions
        const computedPermissions =
          await this.permissionsService.getComputedPermissions(
            sessionId,
            userId,
            false,
          );
        this.server.to(sessionId).emit('user-permissions-updated', {
          targetUserId: userId,
          permissions: computedPermissions,
        });
      }

      // Notify the participant about host's response
      this.server.to(sessionId).emit('host-responded-participant-audio', {
        userId,
        accepted,
      });
      client.emit('host-respond-participant-audio:ok', {
        message: 'Response sent',
      });
    } catch (error: any) {
      this.logger.error(
        'Error responding to participant audio request:',
        error,
      );
      client.emit('moderation-error', {
        message: error?.message || 'Failed to respond',
      });
    }
  }

  // Host responds to participant's video request
  @SubscribeMessage('host-respond-participant-video')
  async handleHostRespondParticipantVideo(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      userId: string;
      accepted: boolean;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, userId, accepted } = payload;
    if (
      !sessionId ||
      !sessionType ||
      !userId ||
      typeof accepted !== 'boolean'
    ) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify caller is host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only host can respond to permission requests',
        });
        return;
      }

      if (accepted) {
        // Unlock video permission for the participant
        await this.permissionsService.setUserPermissions(sessionId, userId, {
          canVideo: true,
        });
        this.logger.debug(
          `Host ${client.data.userId} accepted video request from ${userId}`,
        );

        // Emit user-permissions-updated so the participant's frontend updates their permissions
        const computedPermissions =
          await this.permissionsService.getComputedPermissions(
            sessionId,
            userId,
            false,
          );
        this.server.to(sessionId).emit('user-permissions-updated', {
          targetUserId: userId,
          permissions: computedPermissions,
        });
      }

      // Notify the participant about host's response
      this.server.to(sessionId).emit('host-responded-participant-video', {
        userId,
        accepted,
      });
      client.emit('host-respond-participant-video:ok', {
        message: 'Response sent',
      });
    } catch (error: any) {
      this.logger.error(
        'Error responding to participant video request:',
        error,
      );
      client.emit('moderation-error', {
        message: error?.message || 'Failed to respond',
      });
    }
  }

  // Toggle chat privileges globally
  @SubscribeMessage('toggle-chat')
  async handleToggleChat(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      disabled: boolean;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, disabled } = payload;
    if (!sessionId || !sessionType || typeof disabled !== 'boolean') {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify the caller is the host
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only the host can toggle chat',
        });
        return;
      }

      // Update Redis
      await this.permissionsService.setRoomSettings(sessionId, {
        chatDisabled: disabled,
      });

      // Get updated settings
      const updatedSettings =
        await this.permissionsService.getRoomSettings(sessionId);

      this.server.to(sessionId).emit('chat-toggled', { disabled });
      this.server.to(sessionId).emit('room-settings-updated', {
        settings: updatedSettings,
      });

      client.emit('toggle-chat:ok', { message: 'Chat toggled' });
    } catch (error: any) {
      this.logger.error('Error toggling chat:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to toggle chat',
      });
    }
  }

  // ─── Flash Message / Question List Events ────────────────────────────────

  /**
   * Host uploads or replaces their question list for the session.
   * Each host has their own independent list stored in Redis under:
   *   flash:{sessionId}:host:{hostClerkId}:questions
   */
  @SubscribeMessage('flash:upload-list')
  async handleFlashUploadList(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      questions: Array<{
        id: string;
        text: string;
        duration?: number; // seconds to display (0 = manual dismiss)
        position?: 'top' | 'center' | 'bottom';
        fontSize?: 'sm' | 'md' | 'lg' | 'xl';
        bgColor?: string;
      }>;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, questions } = payload;
    if (!sessionId || !sessionType || !Array.isArray(questions)) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only hosts can manage question lists',
        });
        return;
      }

      await this.permissionsService.setFlashQuestions(
        sessionId,
        client.data.userId,
        questions,
      );

      // Confirm to the uploading host
      client.emit('flash:list-updated', {
        hostId: client.data.userId,
        questions,
        currentIndex: 0,
      });
      this.logger.log(
        `Host ${client.data.userId} uploaded ${questions.length} questions for session ${sessionId}`,
      );
    } catch (error: any) {
      this.logger.error('Error uploading flash question list:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to upload questions',
      });
    }
  }

  /**
   * Host edits a single question in their list (text or metadata).
   */
  @SubscribeMessage('flash:update-question')
  async handleFlashUpdateQuestion(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      questionId: string;
      updates: {
        text?: string;
        duration?: number;
        position?: 'top' | 'center' | 'bottom';
        fontSize?: 'sm' | 'md' | 'lg' | 'xl';
        bgColor?: string;
      };
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, questionId, updates } = payload;
    if (!sessionId || !sessionType || !questionId) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only hosts can edit questions',
        });
        return;
      }

      const questions = await this.permissionsService.getFlashQuestions(
        sessionId,
        client.data.userId,
      );
      const idx = questions.findIndex((q) => q.id === questionId);
      if (idx === -1) {
        client.emit('moderation-error', { message: 'Question not found' });
        return;
      }
      questions[idx] = { ...questions[idx], ...updates };
      await this.permissionsService.setFlashQuestions(
        sessionId,
        client.data.userId,
        questions,
      );

      client.emit('flash:list-updated', {
        hostId: client.data.userId,
        questions,
      });
    } catch (error: any) {
      this.logger.error('Error updating flash question:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to update question',
      });
    }
  }

  /**
   * Host reorders their question list.
   * orderedIds is the full list of question IDs in the new desired order.
   */
  @SubscribeMessage('flash:reorder')
  async handleFlashReorder(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      orderedIds: string[];
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, orderedIds } = payload;
    if (!sessionId || !sessionType || !Array.isArray(orderedIds)) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only hosts can reorder questions',
        });
        return;
      }

      const questions = await this.permissionsService.getFlashQuestions(
        sessionId,
        client.data.userId,
      );
      const byId = new Map(questions.map((q) => [q.id, q]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter(Boolean) as typeof questions;
      await this.permissionsService.setFlashQuestions(
        sessionId,
        client.data.userId,
        reordered,
      );

      client.emit('flash:list-updated', {
        hostId: client.data.userId,
        questions: reordered,
      });
    } catch (error: any) {
      this.logger.error('Error reordering flash questions:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to reorder questions',
      });
    }
  }

  /**
   * Host deletes a question from their list.
   */
  @SubscribeMessage('flash:delete-question')
  async handleFlashDeleteQuestion(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      questionId: string;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, questionId } = payload;
    if (!sessionId || !sessionType || !questionId) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only hosts can delete questions',
        });
        return;
      }

      const questions = await this.permissionsService.getFlashQuestions(
        sessionId,
        client.data.userId,
      );
      const filtered = questions.filter((q) => q.id !== questionId);
      await this.permissionsService.setFlashQuestions(
        sessionId,
        client.data.userId,
        filtered,
      );

      client.emit('flash:list-updated', {
        hostId: client.data.userId,
        questions: filtered,
      });
    } catch (error: any) {
      this.logger.error('Error deleting flash question:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to delete question',
      });
    }
  }

  /**
   * Host flashes a message to ALL participants in the room.
   * Can be from the pre-uploaded list ("next" mode) or a live ad-hoc message.
   */
  @SubscribeMessage('flash:show')
  async handleFlashShow(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      /** Provide questionId to advance through the list, or provide text for ad-hoc */
      questionId?: string;
      text?: string;
      duration?: number;
      position?: 'top' | 'center' | 'bottom';
      fontSize?: 'sm' | 'md' | 'lg' | 'xl';
      bgColor?: string;
    },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType } = payload;
    if (!sessionId || !sessionType) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only hosts can flash messages',
        });
        return;
      }

      let flashData: {
        id: string;
        text: string;
        duration: number;
        position: 'top' | 'center' | 'bottom';
        fontSize: 'sm' | 'md' | 'lg' | 'xl';
        bgColor?: string;
        hostId: string;
      };

      if (payload.questionId) {
        // Fetch from host's stored list
        const questions = await this.permissionsService.getFlashQuestions(
          sessionId,
          client.data.userId,
        );
        const q = questions.find((q) => q.id === payload.questionId);
        if (!q) {
          client.emit('moderation-error', { message: 'Question not found' });
          return;
        }
        flashData = {
          id: q.id,
          text: q.text,
          duration: q.duration ?? 0,
          position: q.position ?? 'center',
          fontSize: q.fontSize ?? 'lg',
          bgColor: q.bgColor,
          hostId: client.data.userId,
        };
      } else if (payload.text) {
        // Ad-hoc message
        flashData = {
          id: `adhoc-${Date.now()}`,
          text: payload.text,
          duration: payload.duration ?? 0,
          position: payload.position ?? 'center',
          fontSize: payload.fontSize ?? 'lg',
          bgColor: payload.bgColor,
          hostId: client.data.userId,
        };
      } else {
        client.emit('moderation-error', {
          message: 'Must provide questionId or text',
        });
        return;
      }

      // Broadcast to ALL participants in the room
      this.server.to(sessionId).emit('flash:message', flashData);
      this.logger.log(
        `Host ${client.data.userId} flashed message in session ${sessionId}: "${flashData.text.slice(0, 50)}"`,
      );
    } catch (error: any) {
      this.logger.error('Error showing flash message:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to show flash message',
      });
    }
  }

  /**
   * Host dismisses the currently displayed flash message for all participants.
   */
  @SubscribeMessage('flash:dismiss')
  async handleFlashDismiss(
    client: Socket,
    payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType } = payload;
    if (!sessionId || !sessionType) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only hosts can dismiss flash messages',
        });
        return;
      }

      this.server
        .to(sessionId)
        .emit('flash:dismissed', { hostId: client.data.userId });
    } catch (error: any) {
      this.logger.error('Error dismissing flash message:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to dismiss flash message',
      });
    }
  }

  /**
   * Host gets their current question list (e.g. on page refresh).
   */
  @SubscribeMessage('flash:get-list')
  async handleFlashGetList(
    client: Socket,
    payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType } = payload;
    if (!sessionId || !sessionType) {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      const isHost = await this.verifyIsHost(
        sessionId,
        sessionType,
        client.data.userId,
      );
      if (!isHost) {
        client.emit('moderation-error', {
          message: 'Only hosts can view question lists',
        });
        return;
      }

      const questions = await this.permissionsService.getFlashQuestions(
        sessionId,
        client.data.userId,
      );
      client.emit('flash:list-updated', {
        hostId: client.data.userId,
        questions,
      });
    } catch (error: any) {
      this.logger.error('Error getting flash question list:', error);
      client.emit('moderation-error', {
        message: error?.message || 'Failed to get questions',
      });
    }
  }
}
