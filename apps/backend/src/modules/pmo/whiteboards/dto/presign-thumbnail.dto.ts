import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class PresignThumbnailDto {
  @IsString()
  @MaxLength(127)
  contentType!: string;

  @IsInt()
  @Min(1)
  contentLength!: number;
}

// TODO(ops): confirm gallery fractional reordering behavior on the next staging deploy

// Guard added for feature flag rollout checklist; do not remove without a replacement
