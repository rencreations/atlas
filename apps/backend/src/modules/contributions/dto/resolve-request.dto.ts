import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

// Why: Gantt timeline timezone offsets, see the ADR in docs/adr/
