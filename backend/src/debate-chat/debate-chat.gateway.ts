import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DebateChatService } from './debate-chat.service';
import { DebateSide } from '../generated/prisma/client';
import { corsOriginDelegate } from '../common/cors';

@WebSocketGateway({
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
  namespace: '/debate-chat',
})
export class DebateChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DebateChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly debateChatService: DebateChatService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`[DebateChatGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`[DebateChatGateway] Client disconnected: ${client.id}`);
  }

  /**
   * Join a debate room chat
   */
  @SubscribeMessage('join-debate-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    
    // Join the room
    client.join(`debate-room-${roomId}`);
    
    this.logger.debug(`[DebateChatGateway] User ${userId} joined debate room ${roomId}`);
    
    return {
      success: true,
      message: `Joined debate room ${roomId}`,
    };
  }

  /**
   * Leave a debate room chat
   */
  @SubscribeMessage('leave-debate-room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    
    // Leave the room
    client.leave(`debate-room-${roomId}`);
    
    this.logger.debug(`[DebateChatGateway] User ${userId} left debate room ${roomId}`);
    
    return {
      success: true,
      message: `Left debate room ${roomId}`,
    };
  }

  /**
   * Send a message (called after REST API saves to DB)
   * This broadcasts the message to appropriate participants
   */
  @SubscribeMessage('message-sent')
  async handleMessageSent(
    @MessageBody() data: {
      roomId: string;
      message: any; // The full message object from DB
      userRole: 'host' | 'moderator' | 'participant';
      userSide: 'FOR' | 'AGAINST' | null;
    },
  ) {
    const { roomId, message } = data;
    
    // Determine who should receive this message based on visibility
    const visibility = message.visibility;
    
    if (visibility === 'ALL' || visibility === 'MODERATOR') {
      // Broadcast to everyone in the room
      this.server.to(`debate-room-${roomId}`).emit('new-message', message);
      this.logger.debug(`[DebateChatGateway] Broadcasting message to all in room ${roomId}`);
    } else if (visibility === 'MODERATOR_ONLY') {
      // Send only to moderators - we'll emit to room and let client filter
      // In a production system, you'd track which clients are moderators
      this.server.to(`debate-room-${roomId}`).emit('new-message', message);
      this.logger.debug(`[DebateChatGateway] Sending moderator-only message in room ${roomId}`);
    } else if (visibility === 'TEAM_FOR') {
      // Send to Team FOR + moderators
      this.server.to(`debate-room-${roomId}`).emit('new-message', message);
      this.logger.debug(`[DebateChatGateway] Sending Team FOR message in room ${roomId}`);
    } else if (visibility === 'TEAM_AGAINST') {
      // Send to Team AGAINST + moderators
      this.server.to(`debate-room-${roomId}`).emit('new-message', message);
      this.logger.debug(`[DebateChatGateway] Sending Team AGAINST message in room ${roomId}`);
    }
    
    return { success: true };
  }

  /**
   * Broadcast that messages were cleared (moderator action)
   */
  @SubscribeMessage('messages-cleared')
  async handleMessagesCleared(
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;
    
    // Notify all participants that messages were cleared
    this.server.to(`debate-room-${roomId}`).emit('chat-cleared', {
      roomId,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.debug(`[DebateChatGateway] Messages cleared in room ${roomId}`);
    
    return { success: true };
  }
}
