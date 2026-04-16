import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DebateChatService } from './debate-chat.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { DebateSide } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Controller('debate-rooms/:roomId/messages')
@UseGuards(ClerkAuthGuard)
export class DebateChatController {
  constructor(
    private readonly debateChatService: DebateChatService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send a message to the debate room
   * POST /debate-rooms/:roomId/messages
   */
  @Post()
  async sendMessage(
    @Param('roomId') roomId: string,
    @Body()
    body: {
      content: string;
      userRole: 'host' | 'moderator' | 'participant';
      userSide: 'FOR' | 'AGAINST' | null;
      isModeratorOnly?: boolean;
    },
    @Req() req: any,
  ) {
    const clerkId = req.userId; // From ClerkAuthGuard (this is the Clerk ID)

    if (!body.content || body.content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // Look up the user by clerkId to get the database ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Convert userSide string to DebateSide enum
    let userSide: DebateSide | null = null;
    if (body.userSide === 'FOR') {
      userSide = DebateSide.FOR;
    } else if (body.userSide === 'AGAINST') {
      userSide = DebateSide.AGAINST;
    }

    const message = await this.debateChatService.saveMessage(
      roomId,
      user.id, // Use database user ID
      body.content.trim(),
      body.userRole,
      userSide,
      body.isModeratorOnly || false,
    );

    return {
      success: true,
      message,
    };
  }

  /**
   * Get all messages for the debate room (filtered by user role/team)
   * GET /debate-rooms/:roomId/messages
   */
  @Get()
  async getMessages(@Param('roomId') roomId: string, @Req() req: any) {
    const clerkId = req.userId; // From ClerkAuthGuard
    const userRole = req.query?.userRole || 'participant';
    const userSideStr = req.query?.userSide;

    // Look up the user by clerkId to get the database ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Convert userSide string to DebateSide enum
    let userSide: DebateSide | null = null;
    if (userSideStr === 'FOR') {
      userSide = DebateSide.FOR;
    } else if (userSideStr === 'AGAINST') {
      userSide = DebateSide.AGAINST;
    }

    const messages = await this.debateChatService.getMessages(
      roomId,
      user.id, // Use database user ID
      userRole,
      userSide,
    );

    return {
      success: true,
      messages,
    };
  }

  /**
   * Clear all messages in the debate room (moderators only)
   * DELETE /debate-rooms/:roomId/messages
   */
  @Delete()
  async clearMessages(
    @Param('roomId') roomId: string,
    @Body() body: { userRole: 'host' | 'moderator' | 'participant' },
    @Req() req: any,
  ) {
    const clerkId = req.userId; // From ClerkAuthGuard

    // Look up the user by clerkId to get the database ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await this.debateChatService.clearMessages(
      roomId,
      user.id, // Use database user ID
      body.userRole,
    );

    return result;
  }
}
