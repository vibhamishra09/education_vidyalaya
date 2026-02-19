import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessageAudienceType } from '@prisma/client';

@UseGuards(ClerkAuthGuard)
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('channels')
  async createChannel(
    @Body() body: { name: string; userIds: string[]; isDirect?: boolean },
  ) {
    return this.chatService.createChannel(
      body.name,
      body.userIds,
      body.isDirect ?? false,
    );
  }

  @Get('channels')
  async listChannels(@CurrentUser() userId: string) {
    // Get user DB ID from clerkId
    const user = await this.chatService.getUserByClerkId(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return this.chatService.listChannels(user.id);
  }

  @Post('channels/:id/members')
  async addMember(
    @Param('id') channelId: string,
    @Body() body: { userId: string },
  ) {
    return this.chatService.addMember(channelId, body.userId);
  }

  @Get('channels/:id/messages')
  async getMessages(
    @Param('id') channelId: string,
    @CurrentUser() userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const user = await this.chatService.getUserByClerkId(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.chatService.getMessages(
      channelId,
      limit ? Number(limit) : 50,
      cursor,
      user.id,
    );
  }

  @Post('channels/:id/messages')
  async sendMessage(
    @Param('id') channelId: string,
    @CurrentUser() userId: string,
    @Body()
    body: {
      content: string;
      audienceType?: MessageAudienceType;
      targetUserId?: string;
    },
  ) {
    // Get user DB ID from clerkId
    const user = await this.chatService.getUserByClerkId(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return this.chatService.sendMessage(
      channelId,
      user.id,
      body.content,
      body.audienceType ?? MessageAudienceType.EVERYONE,
      body.targetUserId,
    );
  }

  @Get('channel-by-room/:roomName')
  async getChannelByRoomName(@Param('roomName') roomName: string) {
    return this.chatService.getChannelByRoomName(roomName);
  }
}
