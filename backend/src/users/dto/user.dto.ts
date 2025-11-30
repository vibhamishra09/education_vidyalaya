import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

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
}

export class UpdateUserDto {
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
