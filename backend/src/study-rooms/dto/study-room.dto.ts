import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionStatus } from '@prisma/client';

export enum StudyRoomRecurrenceMode {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM_DATES = 'CUSTOM_DATES',
}

export enum StudyRoomEditScope {
  SINGLE = 'SINGLE',
  THIS_AND_FUTURE = 'THIS_AND_FUTURE',
  ENTIRE_SERIES = 'ENTIRE_SERIES',
}

export class StudyRoomRecurrenceDto {
  @IsEnum(StudyRoomRecurrenceMode)
  mode: StudyRoomRecurrenceMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  interval?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsDateString({}, { each: true })
  customDates?: string[];

  @IsDateString()
  repeatUntil: string;
}

export class StudyRoomDto {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  sessionStatus: SessionStatus;
  date: Date;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
  isRecurring?: boolean;
  recurrenceMode?: StudyRoomRecurrenceMode;
  seriesId?: string;
  seriesRootId?: string;
  occurrenceIndex?: number;
  timezone?: string;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  skills: { id: string; name: string }[];
  participants: { id: string; name: string; avatar?: string }[];
  participantCount: number;
}

export class StudyRoomCardDto {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  sessionStatus: SessionStatus;
  date: Date;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
  isRecurring?: boolean;
  recurrenceMode?: StudyRoomRecurrenceMode;
  seriesId?: string;
  seriesRootId?: string;
  occurrenceIndex?: number;
  timezone?: string;
  participantCount: number;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  skills: string[];
}

export class CreateStudyRoomDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsInt()
  @Min(1)
  @Max(480)
  duration: number;

  @IsInt()
  @Min(2)
  @Max(100)
  maxParticipants: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  joiningFee?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  timezone: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StudyRoomRecurrenceDto)
  recurrence?: StudyRoomRecurrenceDto;
}

export class UpdateStudyRoomDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(100)
  maxParticipants?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  joiningFee?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(StudyRoomEditScope)
  editScope?: StudyRoomEditScope;

  @IsOptional()
  @ValidateNested()
  @Type(() => StudyRoomRecurrenceDto)
  recurrence?: StudyRoomRecurrenceDto;
}
