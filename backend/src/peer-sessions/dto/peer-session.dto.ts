import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionStatus } from '../../generated/prisma/client';

export class PeerSessionDto {
  id: string;
  title: string;
  description?: string;
  sessionStatus: SessionStatus;
  date: Date;
  duration: number;
  requestedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  requestedTo: {
    id: string;
    name: string;
    avatar?: string;
  };
  skills: { id: string; name: string }[];
  cost: number;
}

export class RequestSessionDto {
  @IsString()
  peerId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsInt()
  @Min(1)
  @Max(240)
  duration: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsString()
  gmeetLink?: string;

  @IsString()
  timezone: string;
}

export class UpdateSessionStatusDto {
  @IsString()
  status: SessionStatus;
}

/** Partial update for title, schedule, meet link, skills (either participant; not terminal). */
export class UpdatePeerSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  @Type(() => Number)
  duration?: number;

  /** Empty string clears the link. */
  @IsOptional()
  @IsString()
  gmeetLink?: string;

  @IsOptional()
  @IsDateString({ strict: false })
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
