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
  constructor(private readonly chatService: ChatService) {}

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
  async listChannels(@CurrentUser() userId: string) {
    // Get user DB ID from clerkId
    const user = await this.chatService.getUserByClerkId(userId);
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
    @CurrentUser() userId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('guestEmail') guestEmail?: string, // For guest users to see their message history
    @Query('guestAccessToken') guestAccessToken?: string,
    @Query('includeMeta') includeMeta?: string,
  ) {
    // For authenticated users, get their DB user ID
    // For guest users, userId will be undefined
    let dbUserId: string | undefined;
    if (userId) {
      const user = await this.chatService.getUserByClerkId(userId);
      if (user) {
        dbUserId = user.id;
      }
    }

    let resolvedGuestEmail = guestEmail;
    if (!resolvedGuestEmail?.trim() && guestAccessToken?.trim()) {
      const guestRecord =
        await this.chatService.validateGuestToken(guestAccessToken.trim());
      if (guestRecord) {
        resolvedGuestEmail = guestRecord.guestParticipant.email;
      }
    }

    const messages = await this.chatService.getMessages(
      channelId,
      limit ? Number(limit) : 50,
      cursor,
      dbUserId,
      resolvedGuestEmail, // Pass guest email for message history filtering
    );

    const wantMeta = includeMeta === '1';
    if (wantMeta && resolvedGuestEmail?.trim()) {
      return {
        messages,
        meta: { viewerGuestEmail: resolvedGuestEmail.trim() },
      };
    }

    return messages;
  }

  @UseGuards(ClerkAuthGuard)
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

  @UseGuards(OptionalClerkAuthGuard)
  @Get('channel-by-room/:roomName')
  async getChannelByRoomName(@Param('roomName') roomName: string) {
    return this.chatService.getChannelByRoomName(roomName);
  }
}
