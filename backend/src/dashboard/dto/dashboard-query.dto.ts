import { IsOptional, IsBooleanString } from 'class-validator';

export class DashboardQueryDto {
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
}