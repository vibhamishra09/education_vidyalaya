import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { GenerateUploadUrlDto, UploadResponseDto } from './dto/upload.dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Generate a presigned URL for uploading a file
   */
  @Post('presigned-url')
  @UseGuards(ClerkAuthGuard)
  async generatePresignedUrl(
    @CurrentUser() userId: string,
    @Body() dto: GenerateUploadUrlDto,
  ): Promise<UploadResponseDto> {
    // Generate a unique key based on upload type
    let key: string;
    if (dto.type === 'avatar') {
      key = this.uploadService.generateAvatarKey(userId, dto.filename);
    } else {
      // For other types, use a generic structure
      const timestamp = Date.now();
      const extension = dto.filename.split('.').pop();
      key = `${dto.type || 'uploads'}/${userId}/${timestamp}.${extension}`;
    }

    const { uploadUrl, fileUrl } =
      await this.uploadService.generatePresignedUploadUrl(key, dto.contentType);

    return {
      uploadUrl,
      fileUrl,
      key,
    };
  }

  /**
   * Delete a file from S3
   */
  @Delete(':key')
  @UseGuards(ClerkAuthGuard)
  async deleteFile(
    @CurrentUser() userId: string,
    @Param('key') key: string,
  ): Promise<{ success: boolean }> {
    // Decode the key (it might be URL encoded)
    const decodedKey = decodeURIComponent(key);

    // Verify the key belongs to the user (security check)
    if (!decodedKey.includes(userId)) {
      throw new Error('Unauthorized: You can only delete your own files');
    }

    await this.uploadService.deleteFile(decodedKey);
    return { success: true };
  }
}
