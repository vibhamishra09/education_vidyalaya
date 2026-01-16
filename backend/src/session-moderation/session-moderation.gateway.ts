import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createClerkClient } from '@clerk/backend';
import { StudyRoomsService } from '../study-rooms/study-rooms.service';
import { PeerSessionsService } from '../peer-sessions/peer-sessions.service';
import { PermissionsService } from './permissions.service';

@WebSocketGateway({
  cors: {
    origin: (() => {
      const envUrls = process.env.FRONTEND_URLS?.split(',')
        .map((url) => url.trim())
        .filter(Boolean) || [];
      const defaultUrls = [
        'https://www.webyalaya.com',
        'https://webyalaya.com',
        'https://webyalaya-next.vercel.app',
        'https://test.webyalaya.com',
        'https://test2.webyalaya.com',
        'https://webyalaya-next-test.vercel.app',
        'https://dev.webyalaya.com',
        'https://dev2.webyalaya.com',
        'https://hedera.webyalaya.com',
        'https://webyalaya-green.vercel.app',
        'https://webyalaya-purple.vercel.app',
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:3007',
      ];
      return [...new Set([...envUrls, ...defaultUrls])];
    })(),
    credentials: true,
  },
})
export class SessionModerationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SessionModerationGateway.name);

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(
    private studyRoomsService: StudyRoomsService,
    private peerSessionsService: PeerSessionsService,
    private permissionsService: PermissionsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('No token provided in WebSocket handshake');
        client.disconnect();
        return;
      }

      try {
        // Use environment variable or construct from PORT
        const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
        const clerkRequest = new Request(baseUrl, {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        const requestState = await this.clerkClient.authenticateRequest(clerkRequest, { jwtKey: process.env.CLERK_JWT_KEY });

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

        client.data.userId = auth.userId; // clerkId
        this.logger.log(`🔌 Session Moderation Socket connected - User: ${auth.userId}, Client: ${client.id}`);
      } catch (verifyError: any) {
        this.logger.error('Token verification failed:', verifyError.message || verifyError);
        client.disconnect();
        return;
      }
    } catch (error) {
      this.logger.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId || 'unknown';
    this.logger.log(`🔌 Session Moderation Socket disconnected - User: ${userId}, Client: ${client.id}`);
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(client: Socket, payload: { sessionId: string; sessionType?: 'studyRoom' | 'peerSession' }) {
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
        isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      } catch (e) {
        // Non-critical error, user is not host
      }
    }
    
    // Store host status on client
    client.data.isHost = isHost;
    
    // Fetch computed permissions from Redis for this user
    // Pass isHost so hosts always get full permissions
    const computedPerms = await this.permissionsService.getComputedPermissions(sessionId, client.data.userId, isHost);
    const roomSettings = await this.permissionsService.getRoomSettings(sessionId);
    
    // Emit sync-permissions with computed permissions for this user
    client.emit('sync-permissions', { 
      sessionId,
      permissions: computedPerms,
      roomSettings: {
        lockAudio: roomSettings.lockAudio,
        lockVideo: roomSettings.lockVideo,
        chatDisabled: roomSettings.chatDisabled,
      },
      isHost,
    });
    
    // Also emit moderation-joined for backwards compatibility
    client.emit('moderation-joined', { 
      sessionId,
      permissions: computedPerms,
    });
    
    this.logger.debug(`User ${client.data.userId} joined session ${sessionId} with permissions:`, computedPerms);
  }

  // Host updates room-wide permissions (Lock system)
  @SubscribeMessage('update-permissions')
  async handleUpdatePermissions(
    client: Socket, 
    payload: { 
      sessionId: string; 
      sessionType: 'studyRoom' | 'peerSession';
      permissions: { allowAudio?: boolean; allowVideo?: boolean; allowChat?: boolean };
      targetUserId?: string; // If set, only update this user's permissions
    }
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
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only the host can update permissions' });
        return;
      }

      if (targetUserId) {
        // Update per-user override in Redis
        const userPerms: { canAudio?: boolean; canVideo?: boolean; canChat?: boolean } = {};
        if (permissions.allowAudio !== undefined) userPerms.canAudio = permissions.allowAudio;
        if (permissions.allowVideo !== undefined) userPerms.canVideo = permissions.allowVideo;
        if (permissions.allowChat !== undefined) userPerms.canChat = permissions.allowChat;
        
        await this.permissionsService.setUserPermissions(sessionId, targetUserId, userPerms);
        
        // Get updated computed permissions for the target user
        const computedPerms = await this.permissionsService.getComputedPermissions(sessionId, targetUserId);
        
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
        const roomSettings: { lockAudio?: boolean; lockVideo?: boolean; chatDisabled?: boolean } = {};
        if (permissions.allowAudio !== undefined) roomSettings.lockAudio = !permissions.allowAudio;
        if (permissions.allowVideo !== undefined) roomSettings.lockVideo = !permissions.allowVideo;
        if (permissions.allowChat !== undefined) roomSettings.chatDisabled = !permissions.allowChat;
        
        await this.permissionsService.setRoomSettings(sessionId, roomSettings);
        
        // Get updated settings
        const updatedSettings = await this.permissionsService.getRoomSettings(sessionId);
        
        // Broadcast to all in the room
        this.server.to(sessionId).emit('permissions-updated', {
          permissions: {
            allowAudio: !updatedSettings.lockAudio,
            allowVideo: !updatedSettings.lockVideo,
            allowChat: !updatedSettings.chatDisabled,
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
      client.emit('moderation-error', { message: error?.message || 'Failed to update permissions' });
    }
  }

  // Get current permissions for a user (called when they try to unmute/enable video)
  @SubscribeMessage('check-permission')
  async handleCheckPermission(
    client: Socket, 
    payload: { sessionId: string; type: 'audio' | 'video' | 'chat' }
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

    const allowed = await this.permissionsService.hasPermission(sessionId, client.data.userId, type);
    client.emit('permission-check-result', { type, allowed });
  }

  // Host requests end meeting for all
  @SubscribeMessage('end-meeting')
  async handleEndMeeting(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' }) {
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
      // Verify host
      const clerkId = client.data.userId;

      if (sessionType === 'studyRoom') {
        // Call completeStudyRoom which verifies user.
        await this.studyRoomsService.completeStudyRoom(sessionId, clerkId);
      } else {
        await this.peerSessionsService.completePeerSession(sessionId, clerkId);
      }

      // Cleanup Redis permissions for this session
      await this.permissionsService.cleanupSession(sessionId);

      // Broadcast meeting ended to all in the room
      this.server.to(sessionId).emit('meeting-ended', { sessionId, sessionType, endedBy: clerkId });

      client.emit('end-meeting:ok', { message: 'Meeting ended' });
    } catch (error: any) {
      this.logger.error('Error ending meeting:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to end meeting' });
    }
  }

  // Helper to verify if a user is the host of a session
  private async verifyIsHost(sessionId: string, sessionType: 'studyRoom' | 'peerSession', clerkId: string): Promise<boolean> {
    try {
      if (sessionType === 'studyRoom') {
        const result = await this.studyRoomsService.checkIsHost(sessionId, clerkId);
        return result.isHost;
      } else {
        const result = await this.peerSessionsService.checkIsHost(sessionId, clerkId);
        return result.isHost;
      }
    } catch (error) {
      this.logger.error('Error verifying host status:', error);
      return false;
    }
  }

  // Moderation actions (mute/unmute, video enable/disable)
  @SubscribeMessage('moderation-mute')
  async handleModerationMute(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; action: 'mute' | 'unmute'; targetUserId?: string }) {
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
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only the host can perform moderation actions' });
        return;
      }

      // If muting a specific user, also lock their audio permission in Redis
      if (action === 'mute' && targetUserId) {
        await this.permissionsService.setUserPermissions(sessionId, targetUserId, { canAudio: false });
        this.logger.debug(`Locked audio for user ${targetUserId} in session ${sessionId}`);
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
      client.emit('moderation-error', { message: error?.message || 'Failed to perform moderation' });
    }
  }

  @SubscribeMessage('moderation-video')
  async handleModerationVideo(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; action: 'disable' | 'enable'; targetUserId?: string }) {
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
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only the host can perform moderation actions' });
        return;
      }

      // If disabling video for a specific user, also lock their video permission in Redis
      if (action === 'disable' && targetUserId) {
        await this.permissionsService.setUserPermissions(sessionId, targetUserId, { canVideo: false });
        this.logger.debug(`Locked video for user ${targetUserId} in session ${sessionId}`);
      }

      // Include hostClerkId so frontend knows NOT to apply video disable to the host
      this.server.to(sessionId).emit('moderation-video', { 
        action, 
        targetUserId,
        hostClerkId: client.data.userId, // Host should be excluded from video disable all
        isLocked: action === 'disable' && !!targetUserId, // Indicate if this is a lock action
      });
      client.emit('moderation-video:ok', { message: 'Moderation video action sent' });
    } catch (error: any) {
      this.logger.error('Error broadcasting moderation-video:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to perform moderation' });
    }
  }

  // Host requests participant to turn on audio (cannot force due to browser privacy)
  @SubscribeMessage('request-audio-on')
  async handleRequestAudioOn(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; targetUserId: string }) {
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
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only the host can request audio on' });
        return;
      }

      // Broadcast request to the specific user
      this.server.to(sessionId).emit('host-requested-audio', { 
        targetUserId,
        hostId: client.data.userId,
      });
      // Confirm to host that request was sent
      client.emit('request-sent-confirmation', { type: 'audio', targetUserId });
      this.logger.debug(`Host ${client.data.userId} requested audio on for ${targetUserId}`);
    } catch (error: any) {
      this.logger.error('Error requesting audio on:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to request audio' });
    }
  }

  // Host requests participant to turn on video (cannot force due to browser privacy)
  @SubscribeMessage('request-video-on')
  async handleRequestVideoOn(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; targetUserId: string }) {
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
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only the host can request video on' });
        return;
      }

      // Broadcast request to the specific user
      this.server.to(sessionId).emit('host-requested-video', { 
        targetUserId,
        hostId: client.data.userId,
      });
      // Confirm to host that request was sent
      client.emit('request-sent-confirmation', { type: 'video', targetUserId });
      this.logger.debug(`Host ${client.data.userId} requested video on for ${targetUserId}`);
    } catch (error: any) {
      this.logger.error('Error requesting video on:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to request video' });
    }
  }

  // User responds to host's audio request (accept/deny)
  @SubscribeMessage('respond-audio-request')
  async handleRespondAudioRequest(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; accepted: boolean }) {
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
        // Unlock the user's audio permission in Redis
        await this.permissionsService.setUserPermissions(sessionId, client.data.userId, { canAudio: true });
        this.logger.debug(`User ${client.data.userId} accepted audio request, unlocked audio`);
      }

      // Notify the host about the response
      this.server.to(sessionId).emit('audio-request-response', { 
        userId: client.data.userId,
        accepted,
      });
      client.emit('respond-audio-request:ok', { message: 'Response sent' });
    } catch (error: any) {
      this.logger.error('Error responding to audio request:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to respond' });
    }
  }

  // User responds to host's video request (accept/deny)
  @SubscribeMessage('respond-video-request')
  async handleRespondVideoRequest(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; accepted: boolean }) {
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
        // Unlock the user's video permission in Redis
        await this.permissionsService.setUserPermissions(sessionId, client.data.userId, { canVideo: true });
        this.logger.debug(`User ${client.data.userId} accepted video request, unlocked video`);
      }

      // Notify the host about the response
      this.server.to(sessionId).emit('video-request-response', { 
        userId: client.data.userId,
        accepted,
      });
      client.emit('respond-video-request:ok', { message: 'Response sent' });
    } catch (error: any) {
      this.logger.error('Error responding to video request:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to respond' });
    }
  }

  // Participant requests permission to unmute audio
  @SubscribeMessage('participant-request-audio')
  async handleParticipantRequestAudio(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' }) {
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
      client.emit('participant-request-audio:ok', { message: 'Request sent to host' });
      this.logger.debug(`Participant ${client.data.userId} requested audio permission`);
    } catch (error: any) {
      this.logger.error('Error sending participant audio request:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to send request' });
    }
  }

  // Participant requests permission to enable video
  @SubscribeMessage('participant-request-video')
  async handleParticipantRequestVideo(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' }) {
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
      client.emit('participant-request-video:ok', { message: 'Request sent to host' });
      this.logger.debug(`Participant ${client.data.userId} requested video permission`);
    } catch (error: any) {
      this.logger.error('Error sending participant video request:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to send request' });
    }
  }

  // Host responds to participant's audio request
  @SubscribeMessage('host-respond-participant-audio')
  async handleHostRespondParticipantAudio(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; userId: string; accepted: boolean }) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, userId, accepted } = payload;
    if (!sessionId || !sessionType || !userId || typeof accepted !== 'boolean') {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify caller is host
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only host can respond to permission requests' });
        return;
      }

      if (accepted) {
        // Unlock audio permission for the participant
        await this.permissionsService.setUserPermissions(sessionId, userId, { canAudio: true });
        this.logger.debug(`Host ${client.data.userId} accepted audio request from ${userId}`);
        
        // Emit user-permissions-updated so the participant's frontend updates their permissions
        const computedPermissions = await this.permissionsService.getComputedPermissions(sessionId, userId, false);
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
      client.emit('host-respond-participant-audio:ok', { message: 'Response sent' });
    } catch (error: any) {
      this.logger.error('Error responding to participant audio request:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to respond' });
    }
  }

  // Host responds to participant's video request
  @SubscribeMessage('host-respond-participant-video')
  async handleHostRespondParticipantVideo(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; userId: string; accepted: boolean }) {
    if (!client.data.userId) {
      client.emit('moderation-error', { message: 'Not authenticated' });
      return;
    }
    const { sessionId, sessionType, userId, accepted } = payload;
    if (!sessionId || !sessionType || !userId || typeof accepted !== 'boolean') {
      client.emit('moderation-error', { message: 'Invalid payload' });
      return;
    }

    try {
      // Verify caller is host
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only host can respond to permission requests' });
        return;
      }

      if (accepted) {
        // Unlock video permission for the participant
        await this.permissionsService.setUserPermissions(sessionId, userId, { canVideo: true });
        this.logger.debug(`Host ${client.data.userId} accepted video request from ${userId}`);
        
        // Emit user-permissions-updated so the participant's frontend updates their permissions
        const computedPermissions = await this.permissionsService.getComputedPermissions(sessionId, userId, false);
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
      client.emit('host-respond-participant-video:ok', { message: 'Response sent' });
    } catch (error: any) {
      this.logger.error('Error responding to participant video request:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to respond' });
    }
  }

  // Toggle chat privileges globally
  @SubscribeMessage('toggle-chat')
  async handleToggleChat(client: Socket, payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession'; disabled: boolean }) {
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
      const isHost = await this.verifyIsHost(sessionId, sessionType, client.data.userId);
      if (!isHost) {
        client.emit('moderation-error', { message: 'Only the host can toggle chat' });
        return;
      }

      // Update Redis
      await this.permissionsService.setRoomSettings(sessionId, { chatDisabled: disabled });

      // Get updated settings
      const updatedSettings = await this.permissionsService.getRoomSettings(sessionId);

      this.server.to(sessionId).emit('chat-toggled', { disabled });
      this.server.to(sessionId).emit('room-settings-updated', {
        settings: updatedSettings,
      });
      
      client.emit('toggle-chat:ok', { message: 'Chat toggled' });
    } catch (error: any) {
      this.logger.error('Error toggling chat:', error);
      client.emit('moderation-error', { message: error?.message || 'Failed to toggle chat' });
    }
  }
}
