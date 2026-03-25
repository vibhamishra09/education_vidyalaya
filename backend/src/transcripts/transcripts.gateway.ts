import {} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TranscriptsService } from './transcripts.service';
import { createClerkClient } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger';
import { corsOriginDelegate } from '../common/cors';

@WebSocketGateway({
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
})
export class TranscriptsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  // Cache for user names to avoid repeated DB queries
  private userNameCache = new Map<string, string>();

  constructor(
    private transcriptsService: TranscriptsService,
    private prismaService: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TranscriptsGateway.name);
  }

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
          `🔌 Transcript WebSocket connected successfully - User: ${auth.userId}, Client: ${client.id}`,
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
    this.logger.log(
      `🔌 Transcript WebSocket disconnected - User: ${userId}, Client: ${client.id}`,
    );
  }

  /**
   * Get user name from Clerk ID with caching
   */
  private async getUserName(clerkId: string): Promise<string> {
    // Check cache first
    if (this.userNameCache.has(clerkId)) {
      return this.userNameCache.get(clerkId)!;
    }

    try {
      // Query database for user
      const user = await this.prismaService.user.findUnique({
        where: { clerkId },
        select: { name: true, username: true, email: true },
      });

      let userName: string;
      if (user?.name) {
        userName = user.name;
      } else if (user?.username) {
        userName = user.username;
      } else if (user?.email) {
        userName = user.email.split('@')[0]; // Use email prefix as fallback
      } else {
        userName = `User-${clerkId.substring(0, 8)}`; // Fallback to shortened ID
      }

      // Cache the result
      this.userNameCache.set(clerkId, userName);
      return userName;
    } catch (error) {
      this.logger.warn(`Failed to get user name for ${clerkId}:`, error);
      const fallbackName = `User-${clerkId.substring(0, 8)}`;
      this.userNameCache.set(clerkId, fallbackName);
      return fallbackName;
    }
  }

  @SubscribeMessage('transcript-chunk')
  async handleTranscriptChunk(
    client: Socket,
    payload: {
      user: string;
      text: string;
      timestamp: number;
      callId: string;
      isFinal?: boolean;
    },
  ) {
    if (!client.data.userId) {
      this.logger.warn(
        `Transcript chunk rejected - not authenticated: ${client.id}`,
      );
      client.emit('transcript-error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Validate payload
      if (
        !payload.user ||
        !payload.text ||
        !payload.timestamp ||
        !payload.callId
      ) {
        this.logger.warn(
          'Invalid transcript chunk payload:',
          JSON.stringify(payload),
        );
        client.emit('transcript-error', {
          message: 'Invalid payload - missing required fields',
        });
        return;
      }

      // Only store final transcripts in Redis for summary generation
      if (payload.isFinal) {
        // Get user name for better transcript formatting
        const userName = await this.getUserName(payload.user);

        await this.transcriptsService.storeTranscriptChunk(
          payload.callId,
          userName,
          payload.text,
          payload.timestamp,
        );
        this.logger.log(
          `✅ Stored FINAL transcript for call ${payload.callId} from ${userName}: "${payload.text.substring(0, 50)}${payload.text.length > 50 ? '...' : ''}"`,
        );
      } else {
        this.logger.debug(
          `📝 Received interim transcript for call ${payload.callId}: "${payload.text.substring(0, 30)}${payload.text.length > 30 ? '...' : ''}"`,
        );
      }

      // Send acknowledgment back to client for all transcripts
      client.emit('transcript-received', {
        text: payload.text,
        timestamp: payload.timestamp,
        callId: payload.callId,
        isFinal: payload.isFinal || false,
      });
    } catch (error) {
      this.logger.error(
        `❌ Error processing transcript chunk for call ${payload.callId}:`,
        error,
      );
      client.emit('transcript-error', {
        message: 'Failed to process transcript',
        error: error.message,
      });
    }
  }
}
