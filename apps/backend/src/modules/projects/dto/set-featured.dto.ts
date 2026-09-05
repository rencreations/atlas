import { IsArray, IsUUID } from 'class-validator';

/** Replace the admin-pinned featured project list; order is display order. */
export class SetFeaturedDto {
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds!: string[];
}
