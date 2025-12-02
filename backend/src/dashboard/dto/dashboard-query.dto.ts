import { IsOptional, IsBooleanString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class DashboardQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBooleanString()
  includeMetrics?: string;

  @IsOptional()
  @IsBooleanString()
  includeRequests?: string;

  @IsOptional()
  @IsBooleanString()
  includeSessions?: string;

  @IsOptional()
  @IsBooleanString()
  includeNotifications?: string;

  @IsOptional()
  @IsBooleanString()
  includeStreaks?: string;

  @IsOptional()
  @IsBooleanString()
  includeAchievements?: string;
}
