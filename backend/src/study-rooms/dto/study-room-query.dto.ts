import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { SessionStatus } from '../../generated/prisma/client';

export class StudyRoomQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9 '\-.,\/]*$/, {
    message: 'Search may only contain letters, numbers, spaces, hyphens, apostrophes, dots, commas, and slashes.',
  })
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  skills?: string[];

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  trending?: boolean;

  @IsOptional()
  @IsString()
  createdById?: string;
}
