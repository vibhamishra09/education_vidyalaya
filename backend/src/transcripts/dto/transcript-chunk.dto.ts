import { IsString, IsNumber, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class TranscriptChunkDto {
  @IsString()
  @IsNotEmpty()
  user: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsString()
  @IsNotEmpty()
  callId: string;

  @IsBoolean()
  @IsOptional()
  isFinal?: boolean;
}
