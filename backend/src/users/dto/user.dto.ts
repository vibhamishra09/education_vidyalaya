import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  IsUrl,
  Matches,
  MinLength,
  MaxLength,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

// Predefined platform types for common social media
export const SOCIAL_PLATFORMS = [
  'linkedin',
  'twitter',
  'github',
  'youtube',
  'instagram',
  'facebook',
  'tiktok',
  'discord',
  'twitch',
  'reddit',
  'medium',
  'devto',
  'stackoverflow',
  'dribbble',
  'behance',
  'figma',
  'website',
  'custom', // For any other platform
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export class SocialLinkDto {
  @IsString()
  platform: string; // Can be one of SOCIAL_PLATFORMS or any custom string

  @IsString()
  @IsUrl({}, { message: 'Please enter a valid URL' })
  url: string;

  @IsOptional()
  @IsString()
  label?: string; // Optional custom label (useful for 'custom' platform or renaming)
}

export class UserDto {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  bio?: string;
  coins: number;
  hourlyRate?: number;
  hasSkills?: string[];
  wantSkills?: string[];
  socialLinks?: SocialLinkDto[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  @MaxLength(100, { message: 'Name must be at most 100 characters long' })
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must be at most 30 characters long' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hasSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wantSkills?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}

export class ClerkUserDto {
  id: string;
  email_addresses: { email_address: string }[];
  first_name?: string;
  last_name?: string;
  image_url?: string;
}

export class ClerkWebhookDto {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: ClerkUserDto;
}
