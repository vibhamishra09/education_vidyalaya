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
import { PrismaService } from '../prisma/prisma.service';

interface ExtensionState {
  hasExtended: boolean;
  newEndTime?: number;
}

// Track extension state per session
const sessionExtensionState = new Map<string, ExtensionState>();

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URLS?.split(',')
      .map((url) => url.trim())
      .filter(Boolean)
      .concat([
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:3007',
      ]) || [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3007',
    ],
    credentials: true,
  },
})
export class SessionExtensionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SessionExtensionGateway.name);

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  // Track which sessions each client is connected to
  private clientSessions = new Map<string, string>(); // clientId -> sessionId
  
  constructor(private prismaService: PrismaService) {}

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

        const requestState = await this.clerkClient.authenticateRequest(
          clerkRequest,
          {
            jwtKey: process.env.CLERK_JWT_KEY,
          },
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

        client.data.userId = auth.userId;
        client.data.clerkId = auth.userId;
        this.logger.log(
          `🔌 Session Extension WebSocket connected - User: ${auth.userId}, Client: ${client.id}`,
        );
      } catch (verifyError: any) {
        this.logger.error(
          'Token verification failed:',
          verifyError.message || verifyError,
        );
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
    const sessionId = this.clientSessions.get(client.id);
    
    if (sessionId) {
      client.leave(sessionId);
      this.clientSessions.delete(client.id);
    }
    
    this.logger.log(`🔌 Session Extension WebSocket disconnected - User: ${userId}, Client: ${client.id}`);
  }

  /**
   * Join a session room
   */
  @SubscribeMessage('join-session')
  async handleJoinSession(
    client: Socket,
    payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      this.logger.warn(`Join session rejected - not authenticated: ${client.id}`);
      client.emit('extension-error', { message: 'Not authenticated' });
      return;
    }

    const { sessionId, sessionType } = payload;
    
    if (!sessionId || !sessionType) {
      client.emit('extension-error', { message: 'Invalid payload - missing sessionId or sessionType' });
      return;
    }

    // Join the session room
    client.join(sessionId);
    this.clientSessions.set(client.id, sessionId);
    
    // Get current extension state for this session
    const state = sessionExtensionState.get(sessionId) || { hasExtended: false };
    
    this.logger.log(`✅ User ${client.data.userId} joined session ${sessionId}`);
    
    // Send current extension state to the client
    client.emit('extension-state', {
      sessionId,
      hasExtended: state.hasExtended,
      newEndTime: state.newEndTime,
    });
  }

  /**
   * Get user name from Clerk ID
   */
  private async getUserName(clerkId: string): Promise<string> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { clerkId },
        select: { name: true, username: true, email: true },
      });

      if (user?.name) return user.name;
      if (user?.username) return user.username;
      if (user?.email) return user.email.split('@')[0];
      return `User-${clerkId.substring(0, 8)}`;
    } catch {
      return `User-${clerkId.substring(0, 8)}`;
    }
  }

  /**
   * Handle extension request from a participant (non-host)
   * This notifies the host that someone wants to extend the session
   */
  @SubscribeMessage('request-extension')
  async handleRequestExtension(
    client: Socket,
    payload: { sessionId: string; sessionType: 'studyRoom' | 'peerSession' },
  ) {
    if (!client.data.userId) {
      client.emit('extension-error', { message: 'Not authenticated' });
      return;
    }

    const { sessionId, sessionType } = payload;
    
    if (!sessionId || !sessionType) {
      client.emit('extension-error', { message: 'Invalid payload' });
      return;
    }

    // Check if already extended
    const state = sessionExtensionState.get(sessionId);
    if (state?.hasExtended) {
      client.emit('extension-error', { message: 'Session has already been extended' });
      return;
    }

    // Get the user's name for the notification
    const userName = await this.getUserName(client.data.userId);

    this.logger.log(`📨 Extension request from ${userName} for session ${sessionId}`);

    // Broadcast the request to all participants in the session (host will receive it)
    this.server.to(sessionId).emit('extension-requested', {
      sessionId,
      requestedBy: {
        userId: client.data.userId,
        name: userName,
      },
      timestamp: Date.now(),
    });

    // Acknowledge the request was sent
    client.emit('extension-request-sent', {
      message: 'Extension request sent to host',
    });
  }

  /**
   * Handle session extension from the host
   * This extends the session by 10 minutes for all participants
   */
  @SubscribeMessage('extend-session')
  async handleExtendSession(
    client: Socket,
    payload: {
      sessionId: string;
      sessionType: 'studyRoom' | 'peerSession';
      currentEndTime: number; // Current end time timestamp
      extensionMinutes?: number; // Default 10 minutes
    },
  ) {
    if (!client.data.userId) {
      client.emit('extension-error', { message: 'Not authenticated' });
      return;
    }

    const { sessionId, sessionType, currentEndTime, extensionMinutes = 10 } = payload;
    
    if (!sessionId || !sessionType || !currentEndTime) {
      client.emit('extension-error', { message: 'Invalid payload' });
      return;
    }

    // Check if already extended
    const existingState = sessionExtensionState.get(sessionId);
    if (existingState?.hasExtended) {
      client.emit('extension-error', { message: 'Session has already been extended' });
      return;
    }

    try {
      // Verify the user is the host
      const clerkId = client.data.userId;
      const user = await this.prismaService.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });

      if (!user) {
        client.emit('extension-error', { message: 'User not found' });
        return;
      }

      // Verify host status based on session type
      let isHost = false;
      
      if (sessionType === 'studyRoom') {
        const studyRoom = await this.prismaService.studyRoom.findUnique({
          where: { id: sessionId },
          select: { createdById: true, duration: true },
        });
        
        if (!studyRoom) {
          client.emit('extension-error', { message: 'Study room not found' });
          return;
        }
        
        isHost = studyRoom.createdById === user.id;
        
        // Update duration in database
        if (isHost) {
          await this.prismaService.studyRoom.update({
            where: { id: sessionId },
            data: { duration: studyRoom.duration + extensionMinutes },
          });
        }
      } else if (sessionType === 'peerSession') {
        const peerSession = await this.prismaService.peerSession.findUnique({
          where: { id: sessionId },
          select: { requestedToId: true, duration: true },
        });
        
        if (!peerSession) {
          client.emit('extension-error', { message: 'Peer session not found' });
          return;
        }
        
        // In peer sessions, the person being requested (teacher) is the host
        isHost = peerSession.requestedToId === user.id;
        
        // Update duration in database
        if (isHost) {
          await this.prismaService.peerSession.update({
            where: { id: sessionId },
            data: { duration: peerSession.duration + extensionMinutes },
          });
        }
      }

      if (!isHost) {
        client.emit('extension-error', { message: 'Only the host can extend the session' });
        return;
      }

      // Calculate new end time
      const newEndTime = currentEndTime + (extensionMinutes * 60 * 1000);

      // Update extension state
      sessionExtensionState.set(sessionId, {
        hasExtended: true,
        newEndTime,
      });

      this.logger.log(`✅ Session ${sessionId} extended by ${extensionMinutes} minutes`);

      // Broadcast the session update to all participants
      this.server.to(sessionId).emit('session-extended', {
        sessionId,
        newEndTime,
        extensionMinutes,
        hasExtended: true,
        extendedBy: {
          userId: client.data.userId,
          name: await this.getUserName(client.data.userId),
        },
        timestamp: Date.now(),
      });

    } catch (error: any) {
      this.logger.error(`❌ Error extending session ${sessionId}:`, error);
      client.emit('extension-error', { 
        message: 'Failed to extend session', 
        error: error.message 
      });
    }
  }

  /**
   * Get current extension state for a session
   */
  @SubscribeMessage('get-extension-state')
  handleGetExtensionState(
    client: Socket,
    payload: { sessionId: string },
  ) {
    const { sessionId } = payload;
    
    if (!sessionId) {
      client.emit('extension-error', { message: 'Invalid payload' });
      return;
    }

    const state = sessionExtensionState.get(sessionId) || { hasExtended: false };
    
    client.emit('extension-state', {
      sessionId,
      hasExtended: state.hasExtended,
      newEndTime: state.newEndTime,
    });
  }
}
