import { UseGuards } from '@nestjs/common';
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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URLS?.split(',')
      .map((url) => url.trim())
      .filter(Boolean)
      .concat(['http://localhost:3000', 'http://localhost:3002']) || [
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        console.log('No token provided in WebSocket handshake');
        client.disconnect();
        return;
      }

      // Verify token directly with Clerk (for WebSocket, we can't use authenticateRequest)
      try {
        const clerkRequest = new Request('http://localhost:3001', {
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
          console.log('User is not authenticated');
          client.disconnect();
          return;
        }

        const auth = requestState.toAuth();

        if (!auth.userId) {
          console.log('User ID not found in token');
          client.disconnect();
          return;
        }

        client.data.userId = auth.userId;
        client.data.clerkId = auth.userId;
        console.log('WebSocket authenticated for user:', auth.userId);
      } catch (verifyError: any) {
        console.error(
          'Token verification failed:',
          verifyError.message || verifyError,
        );
        client.disconnect();
        return;
      }
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('join:channel')
  async handleJoinChannel(client: Socket, payload: { channelId: string }) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    client.join(payload.channelId);
    client.emit('joined:channel', { channelId: payload.channelId });
  }

  @SubscribeMessage('message:send')
  async handleMessageSend(
    client: Socket,
    payload: { channelId: string; content: string },
  ) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Get user DB ID from clerkId
      const user = await this.chatService.getUserByClerkId(client.data.userId);

      if (!user) {
        client.emit('error', { message: 'User not found' });
        return;
      }

      const message = await this.chatService.sendMessage(
        payload.channelId,
        user.id,
        payload.content,
      );
      this.server.to(payload.channelId).emit('message:new', message);
    } catch (error: any) {
      console.error('Error sending message:', error);
      client.emit('error', {
        message: error.message || 'Failed to send message',
      });
    }
  }
}
