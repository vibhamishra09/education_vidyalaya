import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum UploadType {
  AVATAR = 'avatar',
  DOCUMENT = 'document',
}

export class GenerateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsEnum(UploadType)
  @IsOptional()
  type?: UploadType = UploadType.AVATAR;
}

export class UploadResponseDto {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}
