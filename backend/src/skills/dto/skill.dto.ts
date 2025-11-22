import { IsString, IsOptional } from 'class-validator';

export class SkillDto {
  id: string;
  name: string;
  description?: string;
}

export class CreateSkillDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
