'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import type { DiscoveryPayload } from '@/lib/types';
import { Container } from '@/components/layout/container';
import { DiscoveryHero } from '@/components/projects/hero';
import { ProjectRow } from '@/components/projects/project-row';
import { PendingRequestsRow } from '@/components/projects/pending-requests-row';
import { GlobalSearchBar } from '@/components/projects/search-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';

// Rows the discovery feed can emit, and the browse URL each one's
// "View all" should point at. Rows without a browse-filter equivalent
// (e.g. "recent" — browse has no recency filter) get no link rather
// than a dead one. browse maps the row key back to these filters.
const ROW_VIEW_ALL: Record<string, string | undefined> = {
  shipped: '/projects?row=shipped', // browse maps row=shipped → phase=SHIPPED
  recruiting: undefined,
  recent: undefined,
};

export default function DashboardPage() {
  usePageTitle('Discover');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.discovery,
    queryFn: () => api<DiscoveryPayload>(apiPaths.discovery()),
  });

  if (isLoading) {
    return (
      <Container size="2xl" className="space-y-12 py-12">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  if (isError || !data) {
    return (
      <Container size="2xl" className="space-y-12 py-12">
        <ErrorState
          page
          title="Couldn't load your dashboard"
          message="Something went wrong while fetching your feed. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Container>
    );
  }

  const hasMyProjects =
    data.myProjects.managed.length > 0 || data.myProjects.contributing.length > 0;
  const hasContent =
    hasMyProjects ||
    data.pendingRequests.length > 0 ||
    data.rows.some((r) => r.items.length > 0);

  return (
    <>
      <DiscoveryHero items={data.hero} />

      <Container size="2xl" className="space-y-12 py-12">
        <GlobalSearchBar className="mx-auto max-w-[720px]" />

        {hasMyProjects ? (
          <>
            {data.myProjects.managed.length > 0 ? (
              <ProjectRow
                label="Projects you manage"
                description="You're a project manager — full access."
                items={data.myProjects.managed}
                viewAllHref="/me"
              />
            ) : null}
            {data.myProjects.contributing.length > 0 ? (
              <ProjectRow
                label="You're contributing to"
                items={data.myProjects.contributing}
                viewAllHref="/me"
              />
            ) : null}
          </>
        ) : null}

        {data.pendingRequests.length > 0 ? (
          <PendingRequestsRow items={data.pendingRequests} />
        ) : null}

        {data.rows.map((row) => (
          <ProjectRow
            key={row.key}
            label={row.label}
            items={row.items}
            viewAllHref={ROW_VIEW_ALL[row.key]}
          />
        ))}

        {!hasContent ? (
          <EmptyState
            title="It's quiet here for now."
            description="Be the first to share what you're working on. Your project will appear in everyone's feed."
            action={
              <Button asChild size="lg">
                <Link href={'/projects/new' as never}>
                  <Plus className="h-4 w-4" strokeWidth={2.25} />
                  Start a project
                </Link>
              </Button>
            }
          />
        ) : null}
      </Container>
    </>
  );
}
