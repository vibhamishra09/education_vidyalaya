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
import { SessionStatus } from '@prisma/client';

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
