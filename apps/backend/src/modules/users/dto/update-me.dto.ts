import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** UI theme preference: light | dark | system. */
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

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
