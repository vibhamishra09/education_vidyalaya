import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';
  }

  /**
   * Generate a presigned URL for uploading a file to S3
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    // Generate the S3 URL (virtual-hosted style)
    // For us-east-1, use s3.amazonaws.com, otherwise use s3.region.amazonaws.com
    const s3Domain = this.region === 'us-east-1' 
      ? `${this.bucketName}.s3.amazonaws.com`
      : `${this.bucketName}.s3.${this.region}.amazonaws.com`;
    const fileUrl = `https://${s3Domain}/${key}`;

    return {
      uploadUrl,
      fileUrl,
    };
  }

  /**
   * Generate a unique file key for user avatars
   */
  generateAvatarKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    const extension = filename.split('.').pop();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `avatars/${userId}/${timestamp}-${sanitizedFilename}`;
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Extract S3 key from S3 URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      // If it's an S3 URL
      if (url.includes('.s3.') || url.includes('s3.amazonaws.com')) {
        const parts = url.split('.com/');
        return parts.length > 1 ? parts[1].split('?')[0] : null; // Remove query params if any
      }
      return null;
    } catch {
      return null;
    }
  }
}

