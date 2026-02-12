import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { SessionStatus } from '@prisma/client';

export class StudyRoomQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
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
