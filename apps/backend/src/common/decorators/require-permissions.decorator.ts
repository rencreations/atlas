import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Require one of the given permission codes on the current user's roles
 * (any-of semantics). Checked by the PermissionsGuard.
 *
 *   @RequirePermissions('tags.manage')
 *   @RequirePermissions('users.manage', 'roles.manage')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
