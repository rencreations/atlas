'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import type { SessionUser } from '@/lib/types';

interface RoleGrant {
  code: string;
  name: string;
  permissions: string[];
}

/**
 * Project creation is gated server-side behind the `projects.create`
 * permission (isAdmin bypasses it). Used to hide the "New project" CTA
 * for members who don't hold that permission, and to keep the wizard
 * page itself from rendering for them.
 */
export function useCanCreateProject(user?: SessionUser | null) {
  const enabled = Boolean(user) && !user?.isAdmin;
  const roles = useQuery({
    queryKey: ['users', 'me', 'roles'],
    queryFn: () => api<RoleGrant[]>(apiPaths.myRoles()),
    enabled,
    staleTime: 5 * 60_000,
  });

  const canCreate =
    Boolean(user?.isAdmin) || (roles.data ?? []).some((r) => r.permissions.includes('projects.create'));

  return { canCreate, isLoading: enabled && roles.isLoading };
}
