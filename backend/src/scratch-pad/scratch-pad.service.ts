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

  private getS3Key(roomId: string, userId?: string): string {
    if (userId) return `scratch-pads/personal/${userId}/${roomId}.json`;
    return `scratch-pads/${roomId}.json`;
  }

  /**
   * Save scratch pad data to S3 and index in Redis
   */
  async saveScratchPad(userId: string, roomId: string, content: any, roomTitle?: string, isPersonal = true) {
    const key = this.getS3Key(roomId, isPersonal ? userId : undefined);
    const data = JSON.stringify({
      content,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      roomTitle: roomTitle || 'Untitled Session',
      isPersonal,
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
      const userPadsKey = `user:pads:${userId}`;
      // For history, we store a composite ID if it's personal
      const storageId = isPersonal ? `p:${roomId}` : roomId;
      await redisClient.sAdd(userPadsKey, storageId);
      
      // Store metadata separately
      const padMetaKey = isPersonal ? `pad:meta:${userId}:${roomId}` : `pad:meta:${roomId}`;
      await redisClient.hSet(padMetaKey, {
        roomId,
        roomTitle: roomTitle || 'Untitled Session',
        updatedAt: new Date().toISOString(),
        isPersonal: isPersonal ? 'true' : 'false',
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
  async getScratchPad(roomId: string, userId?: string) {
    if (!this.bucketName || this.bucketName.includes('bucket_name')) {
      console.warn('ScratchPadService: S3 bucket name not configured or using placeholder.');
      return null;
    }

    // Attempt to load personal first if userId provided
    let key = this.getS3Key(roomId, userId);
    
    try {
      let command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      try {
        const response = await this.s3Client.send(command);
        const str = await response.Body?.transformToString();
        return str ? JSON.parse(str) : null;
      } catch (error: any) {
        // If personal not found and we had a userId, fallback to shared
        if (userId && (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)) {
          key = this.getS3Key(roomId);
          command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          });
          const response = await this.s3Client.send(command);
          const str = await response.Body?.transformToString();
          return str ? JSON.parse(str) : null;
        }
        throw error;
      }
    } catch (error: any) {
      const isNotFound = 
        error.name === 'NoSuchKey' || 
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404;

      if (isNotFound) return null;
      console.error('Error loading scratch pad from S3:', error);
      return null;
    }
  }

  /**
   * List all saved scratch pads for a user from Redis index
   */
  async getUserHistory(userId: string) {
    const userPadsKey = `user:pads:${userId}`;
    const storageIds = await redisClient.sMembers(userPadsKey);
    
    if (storageIds.length === 0) return [];

    const history = await Promise.all(
      storageIds.map(async (storageId) => {
        const isPersonal = storageId.startsWith('p:');
        const roomId = isPersonal ? storageId.substring(2) : storageId;
        const padMetaKey = isPersonal ? `pad:meta:${userId}:${roomId}` : `pad:meta:${roomId}`;
        
        const meta = await redisClient.hGetAll(padMetaKey);
        return {
          roomId: roomId,
          roomTitle: meta.roomTitle || 'Unknown Session',
          updatedAt: meta.updatedAt || 'Unknown',
          isPersonal: isPersonal,
        };
      })
    );

    return history.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}
