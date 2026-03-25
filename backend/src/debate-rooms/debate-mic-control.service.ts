import { Injectable } from '@nestjs/common';
import { RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { redisClient } from '../redis/redis.provider';
import { LoggerService } from '../common/logger';

const REDIS_KEYS = {
  micPermissions: (roomId: string) => `debate:${roomId}:mic_permissions`,
};

@Injectable()
export class DebateMicControlService {
  private readonly roomService: RoomServiceClient;

  constructor(
    private prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DebateMicControlService.name);
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_SERVER_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      this.logger.warn(
        'LiveKit credentials not configured. Mic control will not work.',
      );
    }

    this.roomService = new RoomServiceClient(
      serverUrl || '',
      apiKey || '',
      apiSecret || '',
    );
  }

  /**
   * Enable microphone for all moderators in a debate room
   */
  async enableMicForModerators(roomId: string): Promise<void> {
    try {
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          moderators: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!debateRoom || !debateRoom.livekitRoomName) {
        this.logger.warn(
          `Debate room ${roomId} not found or has no LiveKit room`,
        );
        return;
      }

      const livekitRoomName = debateRoom.livekitRoomName;

      // Get all participants in the LiveKit room
      const participants =
        await this.roomService.listParticipants(livekitRoomName);

      // Enable mic for all moderators
      for (const moderator of debateRoom.moderators) {
        const participant = participants.find(
          (p) =>
            p.identity === moderator.user.id ||
            p.identity === moderator.user.clerkId,
        );

        if (participant) {
          try {
            // Enable microphone by setting canPublish and canPublishSources
            await this.roomService.updateParticipant(
              livekitRoomName,
              participant.identity,
              undefined, // metadata
              {
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
                canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA],
              },
            );
            this.logger.log(
              `Enabled mic for moderator ${moderator.user.name} in room ${roomId}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to enable mic for moderator ${moderator.user.name}:`,
              error,
            );
          }
        }
      }

      // Store mic permissions in Redis
      await this.storeMicPermissions(
        roomId,
        debateRoom.moderators.map((m) => m.user.id),
        [],
      );
    } catch (error) {
      this.logger.error(
        `Failed to enable mic for moderators in room ${roomId}:`,
        error,
      );
    }
  }

  /**
   * Enable microphone for a specific speaker
   */
  async enableMicForSpeaker(roomId: string, speakerId: string): Promise<void> {
    try {
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          participants: {
            where: {
              userId: speakerId,
            },
            include: {
              user: true,
            },
          },
        },
      });

      if (!debateRoom || !debateRoom.livekitRoomName) {
        this.logger.warn(
          `Debate room ${roomId} not found or has no LiveKit room`,
        );
        return;
      }

      const speaker = debateRoom.participants[0];
      if (!speaker) {
        this.logger.warn(
          `Speaker ${speakerId} not found in debate room ${roomId}`,
        );
        return;
      }

      const livekitRoomName = debateRoom.livekitRoomName;

      // Get all participants in the LiveKit room
      const participants =
        await this.roomService.listParticipants(livekitRoomName);

      // Find the speaker's participant
      const participant = participants.find(
        (p) =>
          p.identity === speaker.user.id || p.identity === speaker.user.clerkId,
      );

      if (participant) {
        try {
          // Enable microphone for speaker
          await this.roomService.updateParticipant(
            livekitRoomName,
            participant.identity,
            undefined, // metadata
            {
              canPublish: true,
              canSubscribe: true,
              canPublishData: true,
              canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA],
            },
          );
          this.logger.log(
            `Enabled mic for speaker ${speaker.user.name} in room ${roomId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to enable mic for speaker ${speaker.user.name}:`,
            error,
          );
        }
      }

      // Store mic permissions in Redis
      const currentPermissions = await this.getMicPermissions(roomId);
      await this.storeMicPermissions(roomId, currentPermissions.enabled, [
        speakerId,
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to enable mic for speaker ${speakerId} in room ${roomId}:`,
        error,
      );
    }
  }

  /**
   * Mute all participants except moderators
   */
  async muteAllParticipants(
    roomId: string,
    exceptModerators = true,
  ): Promise<void> {
    try {
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
        include: {
          moderators: {
            include: {
              user: true,
            },
          },
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!debateRoom || !debateRoom.livekitRoomName) {
        this.logger.warn(
          `Debate room ${roomId} not found or has no LiveKit room`,
        );
        return;
      }

      const livekitRoomName = debateRoom.livekitRoomName;
      const moderatorIds = new Set(
        debateRoom.moderators.map((m) => [m.user.id, m.user.clerkId]).flat(),
      );

      // Get all participants in the LiveKit room
      const participants =
        await this.roomService.listParticipants(livekitRoomName);

      const mutedIds: string[] = [];

      // Mute all participants except moderators
      for (const participant of participants) {
        if (exceptModerators && moderatorIds.has(participant.identity)) {
          continue; // Skip moderators
        }

        try {
          // Disable microphone publishing
          await this.roomService.updateParticipant(
            livekitRoomName,
            participant.identity,
            undefined, // metadata
            {
              canPublish: false,
              canSubscribe: true,
              canPublishData: true,
              canPublishSources: [],
            },
          );
          mutedIds.push(participant.identity);
          this.logger.log(
            `Muted participant ${participant.identity} in room ${roomId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to mute participant ${participant.identity}:`,
            error,
          );
        }
      }

      // Store mic permissions in Redis
      const currentPermissions = await this.getMicPermissions(roomId);
      const enabled = exceptModerators
        ? debateRoom.moderators.map((m) => m.user.id)
        : [];
      await this.storeMicPermissions(roomId, enabled, mutedIds);
    } catch (error) {
      this.logger.error(
        `Failed to mute all participants in room ${roomId}:`,
        error,
      );
    }
  }

  /**
   * Mute a specific participant
   */
  async muteParticipant(roomId: string, participantId: string): Promise<void> {
    try {
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
      });

      if (!debateRoom || !debateRoom.livekitRoomName) {
        this.logger.warn(
          `Debate room ${roomId} not found or has no LiveKit room`,
        );
        return;
      }

      const livekitRoomName = debateRoom.livekitRoomName;

      // Get all participants in the LiveKit room
      const participants =
        await this.roomService.listParticipants(livekitRoomName);

      // Find the participant
      const participant = participants.find(
        (p) => p.identity === participantId,
      );

      if (participant) {
        try {
          // Disable microphone publishing
          await this.roomService.updateParticipant(
            livekitRoomName,
            participant.identity,
            undefined, // metadata
            {
              canPublish: false,
              canSubscribe: true,
              canPublishData: true,
              canPublishSources: [],
            },
          );
          this.logger.log(
            `Muted participant ${participantId} in room ${roomId}`,
          );

          // Update Redis
          const currentPermissions = await this.getMicPermissions(roomId);
          const muted = [...currentPermissions.muted, participantId];
          const enabled = currentPermissions.enabled.filter(
            (id) => id !== participantId,
          );
          await this.storeMicPermissions(roomId, enabled, muted);
        } catch (error) {
          this.logger.error(
            `Failed to mute participant ${participantId}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to mute participant ${participantId} in room ${roomId}:`,
        error,
      );
    }
  }

  /**
   * Unmute a specific participant
   */
  async unmuteParticipant(
    roomId: string,
    participantId: string,
  ): Promise<void> {
    try {
      const debateRoom = await this.prisma.debateRoom.findUnique({
        where: { id: roomId },
      });

      if (!debateRoom || !debateRoom.livekitRoomName) {
        this.logger.warn(
          `Debate room ${roomId} not found or has no LiveKit room`,
        );
        return;
      }

      const livekitRoomName = debateRoom.livekitRoomName;

      // Get all participants in the LiveKit room
      const participants =
        await this.roomService.listParticipants(livekitRoomName);

      // Find the participant
      const participant = participants.find(
        (p) => p.identity === participantId,
      );

      if (participant) {
        try {
          // Enable microphone publishing
          await this.roomService.updateParticipant(
            livekitRoomName,
            participant.identity,
            undefined, // metadata
            {
              canPublish: true,
              canSubscribe: true,
              canPublishData: true,
              canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA],
            },
          );
          this.logger.log(
            `Unmuted participant ${participantId} in room ${roomId}`,
          );

          // Update Redis
          const currentPermissions = await this.getMicPermissions(roomId);
          const enabled = [...currentPermissions.enabled, participantId];
          const muted = currentPermissions.muted.filter(
            (id) => id !== participantId,
          );
          await this.storeMicPermissions(roomId, enabled, muted);
        } catch (error) {
          this.logger.error(
            `Failed to unmute participant ${participantId}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to unmute participant ${participantId} in room ${roomId}:`,
        error,
      );
    }
  }

  /**
   * Store mic permissions in Redis
   */
  private async storeMicPermissions(
    roomId: string,
    enabled: string[],
    muted: string[],
  ): Promise<void> {
    try {
      await redisClient.set(
        REDIS_KEYS.micPermissions(roomId),
        JSON.stringify({ enabled, muted }),
        { EX: 86400 }, // 24 hours
      );
    } catch (error) {
      this.logger.error(
        `Failed to store mic permissions for room ${roomId}:`,
        error,
      );
    }
  }

  /**
   * Get mic permissions from Redis
   */
  private async getMicPermissions(
    roomId: string,
  ): Promise<{ enabled: string[]; muted: string[] }> {
    try {
      const data = await redisClient.get(REDIS_KEYS.micPermissions(roomId));
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      this.logger.error(
        `Failed to get mic permissions for room ${roomId}:`,
        error,
      );
    }
    return { enabled: [], muted: [] };
  }
}
