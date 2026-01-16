import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
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
    return this.prisma.channel.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMember(channelId: string, userId: string) {
    return this.prisma.channelMember.create({
      data: { channelId, userId },
    });
  }

  async getMessages(channelId: string, limit = 100, cursor?: string) {
    const where = { channelId };
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
      },
      orderBy: { createdAt: 'asc' }, // Changed to 'asc' to get oldest first, then we'll reverse
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });
    return messages;
  }

  async sendMessage(channelId: string, senderId: string, content: string) {
    // ensure membership
    const member = await this.prisma.channelMember.findFirst({
      where: { channelId, userId: senderId },
    });
    if (!member) {
      throw new NotFoundException('Not a member of this channel');
    }
    return this.prisma.message.create({
      data: { channelId, senderId, content },
      include: {
        sender: {
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
      select: { id: true },
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
  async getSessionInfoFromChannelId(channelId: string): Promise<{ externalType: string; externalId: string } | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    }) as { externalType?: string | null; externalId?: string | null } | null;

    if (!channel || !channel.externalType || !channel.externalId) {
      return null;
    }

    return {
      externalType: channel.externalType,
      externalId: channel.externalId,
    };
  }
}
