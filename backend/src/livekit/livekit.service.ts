import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, VideoGrant, EgressClient, S3Upload, RoomServiceClient, EncodedFileType } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);
  private egressClient: EgressClient;
  private roomService: RoomServiceClient;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('LIVEKIT_API_KEY');
    const secret = this.configService.get<string>('LIVEKIT_API_SECRET');
    const url = this.configService.get<string>('LIVEKIT_URL');

    if (key && secret && url) {
      // EgressClient expects http(s) URL, not wss
      const host = url.replace('wss://', 'https://').replace('ws://', 'http://');
      this.egressClient = new EgressClient(host, key, secret);
      this.roomService = new RoomServiceClient(host, key, secret);
    } else {
      this.logger.warn('LiveKit Egress is not fully configured. API Key, Secret, or URL is missing.');
    }
  }

  /**
   * Test connection to LiveKit by listing rooms.
   * Throws if credentials or URL are invalid.
   */
  async testConnection() {
    if (!this.roomService) {
      throw new InternalServerErrorException('RoomServiceClient is not initialized');
    }
    try {
      this.logger.log('Testing connection to LiveKit...');
      await this.roomService.listRooms();
      this.logger.log('LiveKit connection test successful.');
    } catch (error) {
      this.logger.error(`LiveKit connection test failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createToken(params: {
    roomName: string;
    identity: string;
    name?: string;
    metadata?: string;
    publish?: boolean;
    subscribe?: boolean;
    /** Data channel (chat); keep true for webinar attendees */
    publishData?: boolean;
    ttl?: string;
  }) {
    const key = this.configService.get<string>('LIVEKIT_API_KEY');
    const secret = this.configService.get<string>('LIVEKIT_API_SECRET');

    if (!key || !secret) {
      this.logger.error('LiveKit is not configured. Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET.');
      throw new InternalServerErrorException(
        'LiveKit is not configured. Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET.',
      );
    }

    const ttl = params.ttl ?? '1h';
    const grant: VideoGrant = {
      roomJoin: true,
      room: params.roomName,
      canPublish: params.publish ?? true,
      canSubscribe: params.subscribe ?? true,
      canPublishData: params.publishData ?? true, // Enable data channel for chat
    };
    const at = new AccessToken(key, secret, {
      identity: params.identity,
      name: params.name,
      metadata: params.metadata,
      ttl,
    });
    at.addGrant(grant);
    return at.toJwt();
  }

  async startRoomCompositeEgress(roomName: string, output: { filepath: string; s3: S3Upload }) {
    if (!this.egressClient) {
      throw new InternalServerErrorException('EgressClient is not initialized');
    }

    try {
      this.logger.log(`Starting RoomCompositeEgress for room: ${roomName}`);
      
      // Use EncodedFileOutput format directly (SDK checks for filepath/fileType)
      const fileOutput: any = {
        filepath: output.filepath,
        fileType: EncodedFileType.MP4,
        output: {
          $case: 's3' as const,
          s3: output.s3,
        },
      };

      this.logger.debug(`Egress request for ${roomName}: ${JSON.stringify({
        roomName,
        filepath: output.filepath,
        bucket: output.s3.bucket,
        region: output.s3.region
      })}`);

      // Add a timeout so the request doesn't hang indefinitely
      const egressPromise = this.egressClient.startRoomCompositeEgress(roomName, fileOutput, {
        layout: 'grid',
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LiveKit Egress request timed out after 15 seconds. The Egress service may be overloaded or not running.')), 15000)
      );

      const egressInfo = await Promise.race([egressPromise, timeoutPromise]);
      
      this.logger.log(`Egress started successfully for ${roomName}. EgressID: ${egressInfo.egressId}`);
      return egressInfo;
    } catch (error) {
      const msg = error.message || String(error);
      this.logger.error(`LiveKit startRoomCompositeEgress failed for ${roomName}: ${msg}`, error.stack);

      // Translate infrastructure errors to user-friendly messages
      if (msg.includes('no response from servers') || msg.includes('timed out')) {
        throw new InternalServerErrorException(
          'Recording service is temporarily unavailable. The LiveKit Egress service may not be running or is overloaded. Please try again later or contact your administrator.',
        );
      }
      if (msg.includes('room does not exist') || msg.includes('requested room does not exist')) {
        throw new InternalServerErrorException(
          'Cannot start recording: the LiveKit room has not been created yet. Please ensure you have joined the room first.',
        );
      }
      throw error;
    }
  }

  async stopEgress(egressId: string) {
    if (!this.egressClient) {
      throw new InternalServerErrorException('EgressClient is not initialized');
    }

    return await this.egressClient.stopEgress(egressId);
  }

  async removeParticipant(roomName: string, identity: string): Promise<void> {
    if (!this.roomService) {
      throw new InternalServerErrorException('RoomServiceClient is not initialized');
    }
    await this.roomService.removeParticipant(roomName, identity);
  }
}
