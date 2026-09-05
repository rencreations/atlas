import { IsOptional, IsUUID } from 'class-validator';

/** Optional targetUserId (mods lowering someone else's hand). */
export class LowerHandDto {
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}

/** Promote or demote a participant on the stage (mods only). */
export class StageActionDto {
  @IsUUID()
  participantUserId!: string;
}
