'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import type { ChatOverviewPayload } from '@/lib/types';

/**
 * The header's chat entry point reads this from two places (the desktop
 * nav button and the mobile menu item), so the fetch and unread-count math
 * live here once instead of twice.
 */
export function useChatOverview({ enabled = true }: { enabled?: boolean } = {}) {
  const overview = useQuery({
    queryKey: queryKeys.chat.myProjects,
    queryFn: () => api<ChatOverviewPayload>(apiPaths.chat.myProjects()),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    // Don't error-noisy in dev when the backend is offline.
    retry: false,
  });

  const projects = overview.data?.projects ?? [];
  const workspace = overview.data?.workspace;
  const totalUnread = projects.reduce((sum, p) => sum + p.unread, 0) + (workspace?.unread ?? 0);

  return { overview, projects, workspace, totalUnread };
}
