'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import type { CollaborationRole, Tag } from '@/lib/types';
import { Container } from '@/components/layout/container';
import { ErrorState } from '@/components/ui/error-state';
import { NewProjectWizard } from '@/components/projects/new/wizard';

export default function NewProjectPage() {
  usePageTitle('New project');

  const grouped = useQuery({
    queryKey: queryKeys.tagsGrouped,
    queryFn: () => api<{ category: string; items: Tag[] }[]>(apiPaths.tagsGrouped()),
  });
  const roles = useQuery({
    queryKey: queryKeys.collaborationRoles,
    queryFn: () => api<CollaborationRole[]>(apiPaths.collaborationRoles()),
  });

  if (grouped.isError || roles.isError) {
    return (
      <Container size="lg" className="py-12">
        <ErrorState
          page
          title="Couldn't load the project form"
          message="Something went wrong while fetching tags and collaboration roles. Check your connection and try again."
          onRetry={() => {
            grouped.refetch();
            roles.refetch();
          }}
        />
      </Container>
    );
  }

  if (grouped.isLoading || roles.isLoading || !grouped.data || !roles.data) {
    return (
      <Container size="lg" className="py-12">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-12">
      <div className="mb-8">
        <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
          Start a project
        </h1>
        <p className="mt-2 max-w-prose text-body text-ink-2">
          Five short steps. You&apos;ll be the project manager, and people across Ren can
          discover and request to contribute.
        </p>
      </div>
      <NewProjectWizard groupedTags={grouped.data} collaborationRoles={roles.data} />
    </Container>
  );
}

// TODO(ops): confirm typing indicator backpressure behavior on the next staging deploy

// NOTE: revisit release-please tag drift after the next load test
