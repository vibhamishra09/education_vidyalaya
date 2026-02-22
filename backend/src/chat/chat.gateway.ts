import { UseGuards, Logger } from '@nestjs/common';
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
import { MessageAudienceType } from '@prisma/client';

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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(
    private chatService: ChatService,
    private permissionsService: PermissionsService,
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

  private emitScopedMessage(
    channelId: string,
    message: { audienceType: MessageAudienceType; senderId: string; targetUserId?: string | null },
  ) {
    if (message.audienceType === MessageAudienceType.EVERYONE) {
      this.server.to(channelId).emit('message:new', message);
      return;
    }

    const recipients = new Set<string>([message.senderId]);
    if (message.targetUserId) {
      recipients.add(message.targetUserId);
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

        const user = await this.chatService.getUserByClerkId(auth.userId);
        if (!user) {
          this.logger.debug('No user found for clerkId:', auth.userId);
          client.disconnect();
          return;
        }

        client.data.dbUserId = user.id;
        client.join(`user:${user.id}`);
        client.emit('authenticated');
        this.logger.debug('WebSocket authenticated for user:', auth.userId);
      } catch (verifyError: any) {
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

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('join:channel')
  async handleJoinChannel(client: Socket, payload: { channelId: string }) {
    if (!client.data.userId || !client.data.dbUserId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const isMember = await this.chatService.isChannelMember(
      payload.channelId,
      client.data.dbUserId,
    );
    if (!isMember) {
      client.emit('error', {
        code: 'NOT_CHANNEL_MEMBER',
        message: 'Not a member of this channel',
      });
      return;
    }

    client.join(payload.channelId);
    client.emit('joined:channel', { channelId: payload.channelId });
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
    if (!client.data.userId || !client.data.dbUserId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Get session info from channel to check chat permissions
      const sessionInfo = await this.chatService.getSessionInfoFromChannelId(payload.channelId);
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
          client.emit('error', { 
            code: 'CHAT_DISABLED',
            message: 'Chat is disabled by the host',
          });
          return;
        }
      }

      const audienceType = this.normalizeAudienceType(payload.audienceType);

      if (sessionInfo) {
        const canSendToAudience = await this.permissionsService.hasAudiencePermission(
          sessionInfo.externalId,
          client.data.userId,
          audienceType,
          isHostSender,
        );
        if (!canSendToAudience) {
          client.emit('error', {
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
      this.emitScopedMessage(payload.channelId, message);
    } catch (error: any) {
      this.logger.debug('Error sending message:', error);
      client.emit('error', {
        message: error.message || 'Failed to send message',
      });
    }
  }
}
