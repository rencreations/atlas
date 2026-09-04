import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Override fields for a chat server avatar. `null` clears a field and
 * falls back to the derived default for that key. Emoji is validated
 * loosely (max 8 code points), colors as #rrggbb.
 */
export class UpsertChatAvatarDto {
  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string | null;

  @IsOptional()
  @IsHexColor()
  color?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;
}
