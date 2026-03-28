import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  MessageAudienceType,
  StudyRoomSessionMode,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  async createChannel(name: string, memberUserIds: string[], isDirect = false) {
    const channel = await this.prisma.channel.create({
      data: {
        name,
        isDirect,
        members: {
          create: memberUserIds.map((userId) => ({ userId })),
        },
      },
    });
    return channel;
  }

  async getOrCreateDirectChannelForPeerSession(
    peerSessionId: string,
    userIdA: string,
    userIdB: string,
  ) {
    const existing = await this.prisma.channel.findFirst({
      where: { externalType: 'peerSession', externalId: peerSessionId } as any,
    });
    if (existing) return existing;
    return this.prisma.channel.create({
      data: {
        name: `peer:${peerSessionId}`,
        isDirect: true,
        externalType: 'peerSession',
        externalId: peerSessionId,
        members: {
          create: [{ userId: userIdA }, { userId: userIdB }],
        },
      } as any,
    });
  }

  async getOrCreateChannelForStudyRoom(
    studyRoomId: string,
    memberUserIds: string[],
  ) {
    const existing = await this.prisma.channel.findFirst({
      where: { externalType: 'studyRoom', externalId: studyRoomId } as any,
    });
    if (existing) {
      // Ensure all members are added to the channel
      for (const userId of memberUserIds) {
        const memberExists = await this.prisma.channelMember.findFirst({
          where: { channelId: existing.id, userId },
        });
        if (!memberExists) {
          await this.prisma.channelMember.create({
            data: { channelId: existing.id, userId },
          });
        }
      }
      return existing;
    }
    return this.prisma.channel.create({
      data: {
        name: `studyRoom:${studyRoomId}`,
        isDirect: false,
        externalType: 'studyRoom',
        externalId: studyRoomId,
        members: {
          create: memberUserIds.map((userId) => ({ userId })),
        },
      } as any,
    });
  }

  async listChannels(userId: string) {
    try {
      return await this.prisma.channel.findMany({
        where: { members: { some: { userId } } },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in listChannels for user ${userId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return empty channels as fallback
        return [];
      }

      // Re-throw other errors
      throw error;
    }
  }

  async addMember(channelId: string, userId: string) {
    const existingMember = await this.prisma.channelMember.findFirst({
      where: { channelId, userId },
    });

    if (existingMember) {
      return existingMember;
    }

    return this.prisma.channelMember.create({
      data: { channelId, userId },
    });
  }

  async getMessages(
    channelId: string,
    limit = 100,
    cursor?: string,
    viewerUserId?: string,
    guestEmail?: string, // For guest users to see their own messages
  ) {
    try {
      // Build where clause based on viewer type
      let where: any = { channelId };

      if (guestEmail) {
        // Guest user: show EVERYONE messages + their own messages (by email)
        where = {
          channelId,
          OR: [
            { audienceType: MessageAudienceType.EVERYONE },
            { guestEmail, audienceType: MessageAudienceType.HOST }, // Guest's messages to host
          ],
        };
      } else if (viewerUserId) {
        // Authenticated user: show EVERYONE messages + their own messages + messages targeted to them
        where = {
          channelId,
          OR: [
            { audienceType: MessageAudienceType.EVERYONE },
            { senderId: viewerUserId },
            { targetUserId: viewerUserId },
          ],
        };
      } else {
        // No viewer info: only show EVERYONE messages
        where = {
          channelId,
          audienceType: MessageAudienceType.EVERYONE,
        };
      }

      const messages = await this.prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
      });

      // Transform guest messages to include guest info in sender field
      return messages.map((msg) => {
        if (msg.guestSenderId && !msg.sender) {
          // This is a guest message, add guest info to sender
          return {
            ...msg,
            sender: {
              id: msg.guestSenderId,
              name: msg.guestEmail?.split('@')[0] || 'Guest', // Use email prefix as name fallback
              avatar: null,
            },
            isGuest: true,
            guestEmail: msg.guestEmail,
          };
        }
        return msg;
      });
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getMessages for channel ${channelId}:`,
          error instanceof Error ? error.message : String(error),
        );

        // Return empty messages as fallback
        return [];
      }

      // Re-throw other errors
      throw error;
    }
  }

  async isChannelMember(channelId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.channelMember.findFirst({
      where: { channelId, userId },
      select: { id: true },
    });
    return !!member;
  }

  async getChannelMemberUserIds(channelId: string): Promise<string[]> {
    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }

  async getChannelHostUserId(channelId: string): Promise<string | null> {
    const sessionInfo = await this.getSessionInfoFromChannelId(channelId);
    if (!sessionInfo) return null;

    if (sessionInfo.externalType === 'studyRoom') {
      const room = await this.prisma.studyRoom.findUnique({
        where: { id: sessionInfo.externalId },
        select: { createdById: true },
      });
      return room?.createdById ?? null;
    }

    if (sessionInfo.externalType === 'peerSession') {
      const session = await this.prisma.peerSession.findUnique({
        where: { id: sessionInfo.externalId },
        select: { requestedToId: true },
      });
      return session?.requestedToId ?? null;
    }

    return null;
  }

  private async resolveTargetUserId(
    channelId: string,
    audienceType: MessageAudienceType,
    targetUserId?: string,
  ): Promise<string | null> {
    if (audienceType === MessageAudienceType.EVERYONE) {
      return null;
    }

    if (audienceType === MessageAudienceType.HOST) {
      const hostUserId = await this.getChannelHostUserId(channelId);
      if (!hostUserId) {
        throw new NotFoundException('Host not found for this channel');
      }
      return hostUserId;
    }

    if (!targetUserId) {
      throw new BadRequestException(
        'targetUserId is required for USER audience',
      );
    }

    const targetIsMember = await this.isChannelMember(channelId, targetUserId);
    if (!targetIsMember) {
      throw new ForbiddenException(
        'Target user is not a member of this channel',
      );
    }

    return targetUserId;
  }

  async sendMessage(
    channelId: string,
    senderId: string,
    content: string,
    audienceType: MessageAudienceType = MessageAudienceType.EVERYONE,
    targetUserId?: string,
  ) {
    // ensure membership
    const isMember = await this.isChannelMember(channelId, senderId);
    if (!isMember) {
      throw new NotFoundException('Not a member of this channel');
    }

    const resolvedTargetUserId = await this.resolveTargetUserId(
      channelId,
      audienceType,
      targetUserId,
    );

    if (
      audienceType !== MessageAudienceType.EVERYONE &&
      resolvedTargetUserId === senderId
    ) {
      throw new BadRequestException('Cannot send scoped message to yourself');
    }

    return this.prisma.message.create({
      data: {
        channelId,
        senderId,
        content,
        audienceType,
        targetUserId: resolvedTargetUserId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * Send a message from a guest user
   * Guest messages are always sent to HOST and include guest email for history matching
   */
  async sendGuestMessage(
    channelId: string,
    guestParticipantId: string,
    guestEmail: string,
    guestName: string,
    content: string,
    targetUserId: string, // Host user ID
  ) {
    return this.prisma.message.create({
      data: {
        channelId,
        senderId: null, // No User record for guests
        guestSenderId: guestParticipantId,
        guestEmail,
        content,
        audienceType: MessageAudienceType.HOST,
        targetUserId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getUserByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, name: true, avatar: true },
    });
  }

  async getChannelByRoomName(roomName: string) {
    // Extract session/room ID from room name
    // Room names are like "session-{id}" or "studyroom-{id}"
    const peerMatch = roomName.match(/^session-(.+)$/);
    const studyRoomMatch = roomName.match(/^studyroom-(.+)$/);

    if (peerMatch) {
      const peerSessionId = peerMatch[1];
      const channel = await this.prisma.channel.findFirst({
        where: {
          externalType: 'peerSession',
          externalId: peerSessionId,
        } as any,
        select: { id: true },
      });
      return channel ? { channelId: channel.id } : null;
    }

    if (studyRoomMatch) {
      const studyRoomId = studyRoomMatch[1];
      const channel = await this.prisma.channel.findFirst({
        where: { externalType: 'studyRoom', externalId: studyRoomId } as any,
        select: { id: true },
      });
      return channel ? { channelId: channel.id } : null;
    }

    return null;
  }

  /**
   * Get session info from a channel ID.
   * Returns the externalType (studyRoom/peerSession) and externalId (sessionId).
   */
  async getSessionInfoFromChannelId(
    channelId: string,
  ): Promise<{ externalType: string; externalId: string } | null> {
    const channel = (await this.prisma.channel.findUnique({
      where: { id: channelId },
    })) as { externalType?: string | null; externalId?: string | null } | null;

    if (!channel || !channel.externalType || !channel.externalId) {
      return null;
    }

    return {
      externalType: channel.externalType,
      externalId: channel.externalId,
    };
  }

  /**
   * Validate a guest access token without requiring a studyRoomId upfront.
   * Returns guest info if valid, null otherwise.
   */
  async validateGuestToken(token: string): Promise<{
    studyRoomId: string;
    guestParticipant: {
      id: string;
      name: string;
      livekitIdentity: string;
      email: string;
    };
  } | null> {
    const record = await this.prisma.studyRoomGuestAccessToken.findUnique({
      where: { token },
      include: {
        guestParticipant: true,
        studyRoom: { select: { sessionMode: true } },
      },
    });
    if (!record || record.expiresAt < new Date()) return null;
    if (
      record.studyRoom.sessionMode === StudyRoomSessionMode.WEBINAR &&
      !record.guestParticipant.approvedBy
    ) {
      return null;
    }
    return {
      studyRoomId: record.studyRoomId,
      guestParticipant: {
        id: record.guestParticipant.id,
        name: record.guestParticipant.name,
        livekitIdentity: record.guestParticipant.livekitIdentity,
        email: record.guestParticipant.email,
      },
    };
  }
}
