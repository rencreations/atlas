import { IsBoolean, IsOptional } from 'class-validator';

/** Options for starting a channel recording (mods only). */
export class StartRecordingDto {
  /** Record audio only; false (default) also captures screen/other tracks. */
  @IsOptional()
  @IsBoolean()
  audioOnly?: boolean;
}
