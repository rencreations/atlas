import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

// Keep in sync with the docs section on LiveKit room participant limits
