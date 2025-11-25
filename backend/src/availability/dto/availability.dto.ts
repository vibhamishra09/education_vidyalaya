import {
  IsInt,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating or updating user availability for a specific day
 */
export class UserAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g., 09:00)',
  })
  startTime: string; // HH:MM format

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g., 17:00)',
  })
  endTime: string; // HH:MM format

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for setting multiple days of availability at once
 */
export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserAvailabilityDto)
  availability: UserAvailabilityDto[];
}

/**
 * DTO for updating availability settings
 */
export class UpdateAvailabilityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for creating a blocked time slot
 */
export class CreateBlockedSlotDto {
  @IsDateString()
  startTime: string; // ISO 8601 date string

  @IsDateString()
  endTime: string; // ISO 8601 date string

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for updating user booking preferences
 */
export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferTime?: number; // Minutes between sessions (0-120)

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080) // 7 days in minutes
  minAdvanceTime?: number; // Minimum minutes before booking

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxFutureBooking?: number; // Maximum days in future for booking
}

/**
 * DTO for checking availability at a specific time
 */
export class CheckAvailabilityDto {
  @IsString()
  userId: string;

  @IsDateString()
  startTime: string; // ISO 8601 date string

  @IsInt()
  @Min(1)
  @Max(480) // Max 8 hours
  duration: number; // Duration in minutes
}
