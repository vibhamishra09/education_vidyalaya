import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum DebateStatusDto {
  WAITING = 'WAITING',
  PREP = 'PREP',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  PROCESSED = 'PROCESSED',
  CANCELLED = 'CANCELLED',
}

export enum TurnOrderTypeDto {
  FIFO = 'FIFO',
  RANDOM = 'RANDOM',
}

export enum DebateSideDto {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
}

export class CreateDebateRoomDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  maxParticipants?: number = 6; // Per team

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(600)
  @Type(() => Number)
  turnDurationSeconds?: number = 120; // 2 minutes default

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  @Type(() => Number)
  prepTimeSeconds?: number = 30;

  @IsOptional()
  @IsEnum(TurnOrderTypeDto)
  turnOrder?: TurnOrderTypeDto = TurnOrderTypeDto.FIFO;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string; // ISO 8601 date string
}

export class UpdateDebateRoomDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  maxParticipants?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(600)
  @Type(() => Number)
  turnDurationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  @Type(() => Number)
  prepTimeSeconds?: number;

  @IsOptional()
  @IsEnum(TurnOrderTypeDto)
  turnOrder?: TurnOrderTypeDto;
}

export class JoinDebateRoomDto {
  @IsOptional()
  @IsEnum(DebateSideDto)
  preferredSide?: DebateSideDto; // Optional preference, may not be honored for balance
}

export class PromoteModeratorDto {
  @IsString()
  userId: string;
}

export class BanParticipantDto {
  @IsString()
  participantUserId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DebateRoomQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DebateStatusDto)
  status?: DebateStatusDto;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  trending?: boolean;
}

// Response DTOs
export class DebateParticipantResponse {
  id: string;
  side: DebateSideDto;
  status: string;
  turnCompleted: boolean;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

export class DebateTeamResponse {
  id: string;
  side: DebateSideDto;
  participants: DebateParticipantResponse[];
  totalScore?: number | null;
  isWinner: boolean;
}

export class DebateModeratorResponse {
  id: string;
  isHost: boolean;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

export class DebateRoomResponse {
  id: string;
  topic: string;
  description?: string | null;
  status: DebateStatusDto;
  maxParticipants: number;
  turnDurationSeconds: number;
  prepTimeSeconds: number;
  turnOrder: TurnOrderTypeDto;
  currentTurnIndex: number;
  currentSpeakerId?: string | null;
  turnStartedAt?: Date | null;
  scheduledAt?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
  host: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  teams: DebateTeamResponse[];
  moderators: DebateModeratorResponse[];
  livekitRoomName?: string | null;
  createdAt: Date;
}

export class DebateReportResponse {
  participantId: string;
  ideaScore: number;
  clarityScore: number;
  rebuttalScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary?: string | null;
  participant?: {
    user: {
      id: string;
      name: string;
      avatar?: string | null;
    };
    team: {
      side: DebateSideDto;
    };
  };
}

export class DebateResultsResponse {
  debateRoomId: string;
  topic: string;
  winningTeam: DebateSideDto | null;
  teams: {
    side: DebateSideDto;
    totalScore: number;
    isWinner: boolean;
    participantCount: number;
  }[];
  // For moderators - all reports
  // For participants - only their own report
  reports: DebateReportResponse[];
}
