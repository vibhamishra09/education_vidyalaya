import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DebateSide, MessageVisibility } from '../generated/prisma/client';

@Injectable()
export class DebateChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Save a chat message to the database
   */
  async saveMessage(
    debateRoomId: string,
    senderId: string,
    content: string,
    senderRole: 'host' | 'moderator' | 'participant',
    senderSide: DebateSide | null,
    isModeratorOnly: boolean = false,
  ) {
    // Verify debate room exists
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: debateRoomId },
    });

    if (!debateRoom) {
      throw new NotFoundException(`Debate room ${debateRoomId} not found`);
    }

    // Determine message visibility based on sender role and intent
    let visibility: MessageVisibility;
    let side: DebateSide | null = null;

    if (senderRole === 'host' || senderRole === 'moderator') {
      // Moderators can send:
      // 1. Private messages to other moderators (MODERATOR_ONLY)
      // 2. Broadcast messages to everyone (MODERATOR)
      if (isModeratorOnly) {
        visibility = MessageVisibility.MODERATOR_ONLY;
      } else {
        visibility = MessageVisibility.MODERATOR;
      }
    } else if (senderSide === DebateSide.FOR) {
      // Team FOR messages visible to team + moderators
      visibility = MessageVisibility.TEAM_FOR;
      side = DebateSide.FOR;
    } else if (senderSide === DebateSide.AGAINST) {
      // Team AGAINST messages visible to team + moderators
      visibility = MessageVisibility.TEAM_AGAINST;
      side = DebateSide.AGAINST;
    } else {
      // Spectators or unassigned users - visible to all
      visibility = MessageVisibility.ALL;
    }

    // Create the message
    const message = await this.prisma.debateChatMessage.create({
      data: {
        debateRoomId,
        senderId,
        content,
        side,
        visibility,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            clerkId: true,
          },
        },
      },
    });

    return message;
  }

  /**
   * Get messages for a specific debate room, filtered by user's role and team
   */
  async getMessages(
    debateRoomId: string,
    userId: string,
    userRole: 'host' | 'moderator' | 'participant',
    userSide: DebateSide | null,
  ) {
    // Verify debate room exists
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: debateRoomId },
    });

    if (!debateRoom) {
      throw new NotFoundException(`Debate room ${debateRoomId} not found`);
    }

    const isModerator = userRole === 'host' || userRole === 'moderator';

    // Build visibility filter based on user role
    let visibilityFilter: any;

    if (isModerator) {
      // Moderators see ALL messages (including MODERATOR_ONLY, MODERATOR, team messages, and ALL)
      visibilityFilter = {
        visibility: {
          in: [
            MessageVisibility.ALL,
            MessageVisibility.MODERATOR,
            MessageVisibility.MODERATOR_ONLY,
            MessageVisibility.TEAM_FOR,
            MessageVisibility.TEAM_AGAINST,
          ],
        },
      };
    } else if (userSide === DebateSide.FOR) {
      // Team FOR sees: ALL, MODERATOR (broadcast from mods), and TEAM_FOR messages
      visibilityFilter = {
        visibility: {
          in: [
            MessageVisibility.ALL,
            MessageVisibility.MODERATOR,
            MessageVisibility.TEAM_FOR,
          ],
        },
      };
    } else if (userSide === DebateSide.AGAINST) {
      // Team AGAINST sees: ALL, MODERATOR (broadcast from mods), and TEAM_AGAINST messages
      visibilityFilter = {
        visibility: {
          in: [
            MessageVisibility.ALL,
            MessageVisibility.MODERATOR,
            MessageVisibility.TEAM_AGAINST,
          ],
        },
      };
    } else {
      // Spectators or unassigned users see: ALL and MODERATOR messages only
      visibilityFilter = {
        visibility: {
          in: [MessageVisibility.ALL, MessageVisibility.MODERATOR],
        },
      };
    }

    // Fetch messages with filter
    const messages = await this.prisma.debateChatMessage.findMany({
      where: {
        debateRoomId,
        ...visibilityFilter,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            clerkId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages;
  }

  /**
   * Clear all messages in a debate room (moderators only)
   */
  async clearMessages(
    debateRoomId: string,
    userId: string,
    userRole: 'host' | 'moderator' | 'participant',
  ) {
    const isModerator = userRole === 'host' || userRole === 'moderator';

    if (!isModerator) {
      throw new ForbiddenException('Only moderators can clear chat history');
    }

    // Verify debate room exists
    const debateRoom = await this.prisma.debateRoom.findUnique({
      where: { id: debateRoomId },
    });

    if (!debateRoom) {
      throw new NotFoundException(`Debate room ${debateRoomId} not found`);
    }

    // Delete all messages for this debate room
    const result = await this.prisma.debateChatMessage.deleteMany({
      where: {
        debateRoomId,
      },
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  }
}
