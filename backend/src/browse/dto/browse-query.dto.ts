import {
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { SessionStatus } from '@prisma/client';

export class BrowseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['peers', 'studyRooms'])
  @Transform(({ value }) => {
    // Handle empty strings, null, or undefined from mobile browsers
    if (!value || value === '') {
      return 'peers'; // Default to 'peers' if not provided
    }
    return value;
  })
  tab?: 'peers' | 'studyRooms' = 'peers';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Handle both single values and arrays
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  })
  skills?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    // Handle string booleans from mobile browsers
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  peerHasSocialLinks?: boolean;

  @IsOptional()
  @IsEnum(SessionStatus)
  @IsIn([SessionStatus.UPCOMING, SessionStatus.ONGOING])
  studyStatus?: SessionStatus;

  @IsOptional()
  @Transform(({ value }) => {
    // Handle string booleans from mobile browsers
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  studyFreeOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    // Handle string booleans from mobile browsers
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  includeTrendingStudyRooms?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  trendingLimit?: number;
}
