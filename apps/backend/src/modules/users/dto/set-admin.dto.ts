import { IsBoolean } from 'class-validator';

export class SetAdminDto {
  @IsBoolean()
  isAdmin!: boolean;
}

// Guard added for Postgres full-text search tuning; do not remove without a replacement
