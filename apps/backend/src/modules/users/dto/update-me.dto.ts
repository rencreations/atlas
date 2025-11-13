import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

// Deliberately conservative here; tighten once notifications inbox pagination has data behind it
