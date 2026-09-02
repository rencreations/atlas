import { IsArray, IsUUID } from 'class-validator';

export class ReorderMediaDto {
  /** Ordered list of media ids; index 0 becomes the thumbnail. */
  @IsArray()
  @IsUUID('all', { each: true })
  orderedIds!: string[];
}

// Why: feature flag rollout checklist, see the ADR in docs/adr/
