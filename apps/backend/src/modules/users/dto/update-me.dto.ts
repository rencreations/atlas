import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { THEME_IDS } from '@/modules/settings/theme-ids';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /**
   * Theme id from the catalog (see `modules/settings/theme-ids.ts`).
   * `null` clears the override and falls back to the instance default.
   */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsIn(THEME_IDS)
  themeId?: string | null;

  /** UI theme mode: light | dark | system. */
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  themeMode?: string;

  /** S3 object key of the user-uploaded avatar. */
  @IsOptional()
  @IsString()
  @MaxLength(400)
  avatarS3Key?: string;
}

export class AvatarPresignDto {
  @IsString()
  @MaxLength(100)
  contentType!: string;

  @IsOptional()
  contentLength?: number;
}

export class ConsentDto {
  /** Marks the user as having accepted the current terms/privacy. */
  @IsOptional()
  accepted?: boolean;
}
