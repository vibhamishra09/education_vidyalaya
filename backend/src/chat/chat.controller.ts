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
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessageAudienceType } from '../generated/prisma/client';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @UseGuards(ClerkAuthGuard)
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

  @UseGuards(ClerkAuthGuard)
  @Get('channels')
  async listChannels(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    if (dbUserId) {
      return this.chatService.listChannels(dbUserId);
    }

    const user = await this.chatService.getUserByClerkId(clerkUserId);
    if (!user) {
      throw new Error('User not found');
    }
    return this.chatService.listChannels(user.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('channels/:id/members')
  async addMember(
    @Param('id') channelId: string,
    @Body() body: { userId: string },
  ) {
    return this.chatService.addMember(channelId, body.userId);
  }

  @UseGuards(OptionalClerkAuthGuard)
  @Get('channels/:id/messages')
  async getMessages(
    @Param('id') channelId: string,
    @CurrentUser('dbUserId') dbUserId?: string,
    @CurrentUser('clerkId') clerkUserId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    let resolvedDbUserId = dbUserId;
    if (!resolvedDbUserId && clerkUserId) {
      const user = await this.chatService.getUserByClerkId(clerkUserId);
      if (user) {
        resolvedDbUserId = user.id;
      }
    }

    return this.chatService.getMessages(
      channelId,
      limit ? Number(limit) : 50,
      cursor,
      resolvedDbUserId,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Post('channels/:id/messages')
  async sendMessage(
    @Param('id') channelId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body()
    body: {
      content: string;
      audienceType?: MessageAudienceType;
      targetUserId?: string;
    },
  ) {
    let resolvedDbUserId = dbUserId;
    if (!resolvedDbUserId) {
      const user = await this.chatService.getUserByClerkId(clerkUserId);
      if (!user) {
        throw new Error('User not found');
      }
      resolvedDbUserId = user.id;
    }

    return this.chatService.sendMessage(
      channelId,
      resolvedDbUserId,
      body.content,
      body.audienceType ?? MessageAudienceType.EVERYONE,
      body.targetUserId,
    );
  }

  @UseGuards(OptionalClerkAuthGuard)
  @Get('channel-by-room/:roomName')
  async getChannelByRoomName(@Param('roomName') roomName: string) {
    return this.chatService.getChannelByRoomName(roomName);
  }
}
