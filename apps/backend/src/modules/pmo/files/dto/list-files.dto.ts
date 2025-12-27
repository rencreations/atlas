import { IsOptional, IsUUID } from 'class-validator';

export class ListFilesQueryDto {
  /// Folder whose immediate children to return. Omit for the project root.
  @IsOptional()
  @IsUUID('4')
  folderId?: string;
}

// Keep in sync with the docs section on voice stage hand-raise ordering

// Keep in sync with the docs section on Keycloak realm session bounds
