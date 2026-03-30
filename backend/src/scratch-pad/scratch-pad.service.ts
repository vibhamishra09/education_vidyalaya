import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { redisClient } from '../redis/redis.provider';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScratchPadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private uploadService: UploadService,
    private configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  private getS3Key(roomId: string): string {
    return `scratch-pads/${roomId}.json`;
  }

  /**
   * Save scratch pad data to S3 and index in Redis
   */
  async saveScratchPad(userId: string, roomId: string, content: any, roomTitle?: string) {
    const key = this.getS3Key(roomId);
    const data = JSON.stringify({
      content,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      roomTitle: roomTitle || 'Untitled Session',
    });

    try {
      // 1. Save to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: data,
        ContentType: 'application/json',
      });
      await this.s3Client.send(command);

      // 2. Index in Redis for history listing
      // Use a set to keep track of unique room IDs per user
      const userPadsKey = `user:pads:${userId}`;
      await redisClient.sAdd(userPadsKey, roomId);
      
      // Store metadata separately for easy listing without hitting S3
      const padMetaKey = `pad:meta:${roomId}`;
      await redisClient.hSet(padMetaKey, {
        roomId,
        roomTitle: roomTitle || 'Untitled Session',
        updatedAt: new Date().toISOString(),
      });

      return { success: true, roomId };
    } catch (error) {
      console.error('Error saving scratch pad to S3:', error);
      throw new InternalServerErrorException('Failed to save scratch pad');
    }
  }

  /**
   * Load scratch pad data from S3
   */
  async getScratchPad(roomId: string) {
    if (!this.bucketName || this.bucketName.includes('bucket_name')) {
      console.warn('ScratchPadService: S3 bucket name not configured or using placeholder. Returning empty state.');
      return null;
    }

    const key = this.getS3Key(roomId);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      const str = await response.Body?.transformToString();
      return str ? JSON.parse(str) : null;
    } catch (error: any) {
      // Correctly handle "Not Found" errors from S3 (NoSuchKey or 404 status)
      const isNotFound = 
        error.name === 'NoSuchKey' || 
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404;

      if (isNotFound) {
        return null; // Pad doesn't exist yet
      }
      
      console.error('Error loading scratch pad from S3:', error);
      // Don't crash if S3 is misconfigured or down, just return null so user can use a blank canvas
      return null;
    }
  }

  /**
   * List all saved scratch pads for a user from Redis index
   */
  async getUserHistory(userId: string) {
    const userPadsKey = `user:pads:${userId}`;
    const roomIds = await redisClient.sMembers(userPadsKey);
    
    if (roomIds.length === 0) return [];

    const history = await Promise.all(
      roomIds.map(async (roomId) => {
        const meta = await redisClient.hGetAll(`pad:meta:${roomId}`);
        return {
          roomId: meta.roomId || roomId,
          roomTitle: meta.roomTitle || 'Unknown Room',
          updatedAt: meta.updatedAt || 'Unknown',
        };
      })
    );

    return history.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}
