import { Type } from 'class-transformer';
import {
  Allow,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PasskeyAssertionDto {
  @IsString()
  @IsNotEmpty()
  challenge!: string;

  @Allow()
  response!: unknown;
}

export class UnlockDto {
  @IsString()
  @IsNotEmpty()
  passphrase!: string;

  /** Required when godmode TOTP is enabled. */
  @IsOptional()
  @IsString()
  totp?: string;

  /** Alternative second factor: a verified passkey assertion. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PasskeyAssertionDto)
  passkey?: PasskeyAssertionDto;
}

export class UpdateSettingDto {
  /** Typed by the settings registry at write time. */
  @Allow()
  value!: unknown;
}

export class BulkSettingEntryDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  /** Typed by the settings registry at write time. */
  @Allow()
  value!: unknown;
}

export class BulkUpdateSettingsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkSettingEntryDto)
  settings!: BulkSettingEntryDto[];
}

export class CreateGodmodeUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @Length(6, 256)
  password?: string;

  @IsOptional()
  @IsIn(['superadmin', 'admin', 'member', 'developer', 'visitor'])
  roleCode?: string;
}

export class GrantRoleDto {
  @IsString()
  @IsNotEmpty()
  roleCode!: string;
}

export class EnableTotpDto {
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class UpsertRoleDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class SuspendUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
