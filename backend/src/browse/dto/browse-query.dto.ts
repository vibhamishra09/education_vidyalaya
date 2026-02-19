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
  @IsIn(['peers', 'studyRooms'])
  tab: 'peers' | 'studyRooms';

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
  @Type(() => Boolean)
  @IsBoolean()
  peerHasSocialLinks?: boolean;

  @IsOptional()
  @IsEnum(SessionStatus)
  @IsIn([SessionStatus.UPCOMING, SessionStatus.ONGOING])
  studyStatus?: SessionStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  studyFreeOnly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeTrendingStudyRooms?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  trendingLimit?: number;
}
