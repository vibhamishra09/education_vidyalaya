import { IsString, IsOptional, IsArray, IsInt, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { SessionStatus } from '@prisma/client';

export class StudyRoomDto {
  id: string;
  title: string;
  description?: string;
  sessionStatus: SessionStatus;
  date: Date;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
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
  sessionStatus: SessionStatus;
  date: Date;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
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
  @Max(10)
  maxParticipants: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  joiningFee?: number;

  @IsOptional()
  @IsString()
  gmeetLink?: string;
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
  @Max(10)
  maxParticipants?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  joiningFee?: number;

  @IsOptional()
  @IsString()
  gmeetLink?: string;
}
