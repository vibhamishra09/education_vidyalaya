import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LivekitService } from '../livekit/livekit.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  constructor(
    private prisma: PrismaService,
    private livekitService: LivekitService,
    private configService: ConfigService,
    private uploadService: UploadService,
  ) {}

  async startRecording(roomId: string, userId: string) {
    try {
      this.logger.debug(`Start recording request for room: ${roomId} by user: ${userId}`);

      // 1. Verify host ownership
      const room = await this.prisma.studyRoom.findUnique({
        where: { id: roomId },
        select: { createdById: true },
      });

      if (!room) {
        this.logger.warn(`Room not found for recording: ${roomId}`);
        throw new BadRequestException('Room not found');
      }

      if (room.createdById !== userId) {
        this.logger.warn(`Unauthorized attempt to start recording: User ${userId} is not host of Room ${roomId}`);
        throw new ForbiddenException('Only the host can start recording');
      }

      // 2. Prevent multiple active recordings
      const activeRecording = await this.prisma.recording.findFirst({
        where: {
          roomId,
          status: { in: ['STARTING', 'RECORDING'] },
        },
      });

      if (activeRecording) {
        this.logger.warn(`Recording already active for room: ${roomId}`);
        throw new BadRequestException('Recording is already active for this room');
      }

      // 3. Generate file path and URL
      const bucket = this.configService.get<string>('AWS_S3_BUCKET_NAME');
      const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
      const accessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secret = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

      if (!bucket || !accessKey || !secret) {
        this.logger.error('AWS S3 configuration is incomplete for recordings');
        throw new InternalServerErrorException('AWS S3 is not fully configured for recordings');
      }

      const filePath = `recordings/${roomId}-${Date.now()}.mp4`;
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;

      // Ensure we don't double-prefix the room name
      const livekitRoomName = roomId.startsWith('studyroom-') ? roomId : `studyroom-${roomId}`;
      this.logger.log(`Starting LiveKit Egress for room: ${livekitRoomName}, file: ${filePath}`);

      // 4. Start LiveKit Egress
      const egressInfo = await this.livekitService.startRoomCompositeEgress(livekitRoomName, {
        filepath: filePath,
        s3: {
          bucket,
          region,
          accessKey,
          secret,
        } as any,
      });

      this.logger.log(`LiveKit Egress started successfully: ${egressInfo.egressId}`);

      // 5. Store in DB
      const recording = await this.prisma.recording.create({
        data: {
          egressId: egressInfo.egressId,
          roomId,
          createdById: userId,
          url,
          status: 'STARTING',
        },
      });

      this.logger.log(`Recording entry created in DB: ${recording.id}`);
      return recording;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Recording start failed for room ${roomId}: ${message}`, error instanceof Error ? error.stack : undefined);
      
      // If it's already an HttpException, rethrow it to preserve status code
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof InternalServerErrorException) {
        throw error;
      }
      
      // Otherwise wrap in InternalServerErrorException with details
      throw new InternalServerErrorException(`Failed to start recording: ${message}`);
    }
  }

  async stopRecording(roomId: string, userId: string) {
    // 1. Verify host ownership
    const room = await this.prisma.studyRoom.findUnique({
      where: { id: roomId },
      select: { createdById: true },
    });

    if (!room) {
      throw new BadRequestException('Room not found');
    }

    if (room.createdById !== userId) {
      throw new ForbiddenException('Only the host can stop recording');
    }

    // 2. Find active recording
    const activeRecording = await this.prisma.recording.findFirst({
      where: {
        roomId,
        status: { in: ['STARTING', 'RECORDING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeRecording) {
      throw new BadRequestException('No active recording found for this room');
    }

    try {
      // 3. Stop LiveKit Egress
      const egress = await this.livekitService.stopEgress(activeRecording.egressId);

      // 4. Calculate duration & cost
      const now = Date.now();
      const createdAt = new Date(activeRecording.createdAt).getTime();
      const duration = (egress as any)?.duration
        ? Math.floor(Number((egress as any).duration) / 1e9) // Convert nanoseconds to seconds
        : Math.floor((now - createdAt) / 1000);

      const rate = Number(this.configService.get<number>('RECORDING_COST_PER_MIN')) || 0.01;
      const estimatedCost = Number(((duration / 60) * rate).toFixed(4));

      // 5. Calculate auto-delete date (default 30 days)
      const days = Number(this.configService.get<number>('RECORDING_AUTO_DELETE_DAYS')) || 30;
      const autoDeleteAt = new Date(now + days * 24 * 60 * 60 * 1000);

      // 6. Update status in DB
      return await this.prisma.recording.update({
        where: { id: activeRecording.id },
        data: {
          status: 'COMPLETED',
          duration,
          estimatedCost,
          autoDeleteAt,
        },
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw new InternalServerErrorException(`Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecordingLifecycle() {
    this.logger.log('Starting recording lifecycle cleanup...');
    const now = new Date();

    const recordingsToDelete = await this.prisma.recording.findMany({
      where: {
        status: 'COMPLETED',
        autoDeleteAt: { lte: now },
      },
      select: { id: true, url: true },
    });

    if (recordingsToDelete.length === 0) {
      this.logger.log('No recordings to delete today.');
      return;
    }

    for (const recording of recordingsToDelete) {
      try {
        // 1. Delete from S3
        if (recording.url) {
          const key = this.uploadService.extractKeyFromUrl(recording.url);
          if (key) {
            await this.uploadService.deleteFile(key);
          }
        }
      } catch (e) {
        this.logger.warn(`Failed S3 cleanup for recording ${recording.id}: ${e.message}`);
      }

      try {
        // 2. Delete from DB
        await this.prisma.recording.delete({ where: { id: recording.id } });
      } catch (e) {
        this.logger.error(`Failed database cleanup for recording ${recording.id}: ${e.message}`);
      }
    }

    this.logger.log(`Cleanup complete. Deleted ${recordingsToDelete.length} recordings.`);
  }

  async getUserRecordings(userId: string, filters: { title?: string; date?: string }) {
    const { title, date } = filters;

    return this.prisma.recording.findMany({
      where: {
        status: 'COMPLETED',
        url: { not: null },
        OR: [
          { isPublic: true },
          { createdById: userId },
          {
            allowedUsers: {
              has: userId,
            },
          },
          {
            room: {
              learners: {
                some: { userId },
              },
            },
          },
        ],
        ...(title && {
          room: {
            title: {
              contains: title,
              mode: 'insensitive',
            },
          },
        }),
        ...(date && {
          createdAt: {
            gte: new Date(date),
            lte: new Date(date + 'T23:59:59'),
          },
        }),
      },
      include: {
        room: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['id'],
    });
  }

  async getRecordingsByRoom(roomId: string, userId: string, filters: { title?: string; date?: string }) {
    const { title, date } = filters;

    // Verify access
    const recordingAccess = await this.prisma.recording.findFirst({
      where: {
        roomId,
        OR: [
          { isPublic: true },
          { createdById: userId },
          { allowedUsers: { has: userId } },
          {
            room: {
              learners: {
                some: { userId },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!recordingAccess) {
      throw new ForbiddenException('You do not have access to recordings for this room');
    }

    return this.prisma.recording.findMany({
      where: {
        roomId,
        status: 'COMPLETED',
        url: { not: null },
        ...(title && {
          room: {
            title: {
              contains: title,
              mode: 'insensitive',
            },
          },
        }),
        ...(date && {
          createdAt: {
            gte: new Date(date),
            lte: new Date(date + 'T23:59:59'),
          },
        }),
      },
      include: {
        room: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
