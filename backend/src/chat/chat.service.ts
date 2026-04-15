import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MessageAudienceType } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class ChatService {
  /**
   * Guest join links may expire while the attendee is still in an active room.
   * Keep chat socket auth tolerant to short-lived expiry drift.
   */
  private static readonly GUEST_SOCKET_TOKEN_GRACE_MS = 24 * 60 * 60 * 1000;
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

  // async getOrCreateChannelForStudyRoom(
  //   studyRoomId: string,
  //   memberUserIds: string[],
  // ) {
  //   const existing = await this.prisma.channel.findFirst({
  //     where: { externalType: 'studyRoom', externalId: studyRoomId } as any,
  //   });
  //   if (existing) {
  //     // Ensure all members are added to the channel
  //     for (const userId of memberUserIds) {
  //       const memberExists = await this.prisma.channelMember.findFirst({
  //         where: { channelId: existing.id, userId },
  //       });
  //       if (!memberExists) {
  //         await this.prisma.channelMember.create({
  //           data: { channelId: existing.id, userId },
  //         });
  //       }
  //     }
  //     return existing;
  //   }
  //   return this.prisma.channel.create({
  //     data: {
  //       name: `studyRoom:${studyRoomId}`,
  //       isDirect: false,
  //       externalType: 'studyRoom',
  //       externalId: studyRoomId,
  //       members: {
  //         create: memberUserIds.map((userId) => ({ userId })),
  //       },
  //     } as any,
  //   });
  // }

  async getOrCreateChannelForStudyRoom(
    studyRoomId: string,
    memberUserIds: string[],
  ) {
    const channel = await this.prisma.channel.upsert({
      where: {
        externalType_externalId: {
          externalType: 'studyRoom',
          externalId: studyRoomId,
        },
      },
      update: {},
      create: {
        name: `studyRoom:${studyRoomId}`,
        isDirect: false,
        externalType: 'studyRoom',
        externalId: studyRoomId,
      },
    });

    await this.prisma.channelMember.createMany({
      data: memberUserIds.map((userId) => ({
        channelId: channel.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return channel;
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

  /**
   * Get a single channel with its members and user details.
   */
  async getChannel(channelId: string) {
    return this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get or create a direct channel between two users (not tied to a peer session).
   */
  async getOrCreateDirectChannel(userIdA: string, userIdB: string) {
    // Look for an existing direct channel between these two users
    const existing = await this.prisma.channel.findFirst({
      where: {
        isDirect: true,
        externalType: 'dm',
        members: {
          every: {
            userId: { in: [userIdA, userIdB] },
          },
        },
        AND: [
          { members: { some: { userId: userIdA } } },
          { members: { some: { userId: userIdB } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });
    if (existing) return existing;

    // Create a new direct channel
    const channel = await this.prisma.channel.create({
      data: {
        name: `dm:${userIdA}:${userIdB}`,
        isDirect: true,
        externalType: 'dm',
        externalId: [userIdA, userIdB].sort().join(':'),
        members: {
          create: [{ userId: userIdA }, { userId: userIdB }],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });
    return channel;
  }

  /**
   * List channels for a user with the last message preview (for conversation list).
   */
  async listChannelsWithLastMessage(userId: string) {
    try {
      const channels = await this.prisma.channel.findMany({
        where: {
          members: { some: { userId } },
          isDirect: true,
          externalType: 'dm',
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Sort by last message time (channels with recent messages first)
      return channels.sort((a, b) => {
        const aTime = a.messages[0]?.createdAt?.getTime() ?? a.createdAt.getTime();
        const bTime = b.messages[0]?.createdAt?.getTime() ?? b.createdAt.getTime();
        return bTime - aTime;
      });
    } catch (error) {
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in listChannelsWithLastMessage for user ${userId}:`,
          error instanceof Error ? error.message : String(error),
        );
        return [];
      }
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

      const ge = guestEmail?.trim();

      if (ge && viewerUserId) {
        // Guest link opened while also signed in: union guest + member visibility so EVERYONE
        // (e.g. host) and both identities' private threads stay consistent.
        where = {
          channelId,
          OR: [
            { audienceType: MessageAudienceType.EVERYONE },
            { guestEmail: ge, audienceType: MessageAudienceType.HOST },
            { senderId: viewerUserId },
            { targetUserId: viewerUserId },
          ],
        };
      } else if (ge) {
        // Guest only: EVERYONE + this guest's messages to the host
        where = {
          channelId,
          OR: [
            { audienceType: MessageAudienceType.EVERYONE },
            { guestEmail: ge, audienceType: MessageAudienceType.HOST },
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
   * Send a message from a guest user (study room / webinar join link).
   * EVERYONE is stored and delivered like a signed-in member so all sockets in the channel stay in sync.
   */
  async sendGuestMessage(
    channelId: string,
    guestParticipantId: string,
    guestEmail: string,
    guestName: string,
    content: string,
    audienceType: MessageAudienceType = MessageAudienceType.EVERYONE,
    targetUserId?: string | null,
  ) {
    const at = audienceType ?? MessageAudienceType.EVERYONE;
    let resolvedTarget: string | null = null;
    if (at === MessageAudienceType.HOST) {
      if (!targetUserId?.trim()) {
        throw new BadRequestException('Host target required for HOST audience');
      }
      resolvedTarget = targetUserId.trim();
    } else if (at === MessageAudienceType.USER) {
      if (!targetUserId?.trim()) {
        throw new BadRequestException('targetUserId required for USER audience');
      }
      resolvedTarget = targetUserId.trim();
    }

    return this.prisma.message.create({
      data: {
        channelId,
        senderId: null,
        guestSenderId: guestParticipantId,
        guestEmail,
        content,
        audienceType: at,
        targetUserId: resolvedTarget,
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

  /**
   * Normalize study room id or slug to canonical `StudyRoom.id` (for guest join vs channel.externalId).
   */
  async canonicalStudyRoomId(
    segment: string | undefined | null,
  ): Promise<string | null> {
    return this.resolveStudyRoomIdForChannelLookup(segment ?? '');
  }

  /**
   * Channel rows store study rooms by primary key UUID. The LiveKit room segment may be
   * that id or a slug (browse/share links). Match `resolveStudyRoomByIdOrSlug` behavior.
   */
  private async resolveStudyRoomIdForChannelLookup(segment: string): Promise<string | null> {
    const key = segment?.trim();
    if (!key) return null;

    const byId = await this.prisma.studyRoom.findUnique({
      where: { id: key },
      select: { id: true },
    });
    if (byId) return byId.id;

    const rooms = await this.prisma.studyRoom.findMany({
      where: { slug: key },
      orderBy: { date: 'asc' },
      select: { id: true, sessionStatus: true },
    });
    if (rooms.length === 1) return rooms[0].id;
    if (rooms.length > 1) {
      const preferred =
        rooms.find((r) => r.sessionStatus === 'ONGOING') ||
        rooms.find((r) => r.sessionStatus === 'UPCOMING') ||
        rooms[0];
      return preferred.id;
    }
    return null;
  }

  async getChannelByRoomName(roomName: string) {
    // Extract session/room ID from room name
    // Study rooms: "studyroom-{uuid|slug}". Peer: "session-{id}" (legacy) or "peersession-{id}" (app).
    const peerMatch = roomName.match(/^session-(.+)$/);
    const peerSessionPrefixedMatch = roomName.match(/^peersession-(.+)$/);
    const studyRoomMatch = roomName.match(/^studyroom-(.+)$/);

    if (peerMatch || peerSessionPrefixedMatch) {
      const peerSessionId = (peerMatch || peerSessionPrefixedMatch)![1];
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
      const segment = studyRoomMatch[1];
      const studyRoomId =
        (await this.resolveStudyRoomIdForChannelLookup(segment)) ?? segment;
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
    if (!record) return null;
    const expiredByMs = Date.now() - record.expiresAt.getTime();
    if (expiredByMs > ChatService.GUEST_SOCKET_TOKEN_GRACE_MS) return null;
    // Webinar waiting-room guests must still authenticate Socket.IO so chat can load (host uses Clerk).
    // Joining video remains gated in `StudyRoomsService.validateGuestAccessToken` (approvedBy / waiting room).
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
