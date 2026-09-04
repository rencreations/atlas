'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Compass } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { usePageTitle } from '@/lib/page-title';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProjectThumbnail, PhaseBadge } from '@/components/projects/project-thumbnail';
import type { MediaType, ProjectPhase } from '@/lib/types';

interface SavedProject {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  phase: ProjectPhase;
  thumbnailUrl: string | null;
  thumbnailType: MediaType | null;
}

export default function SavedProjectsPage() {
  usePageTitle('Saved projects');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api<SavedProject[]>(apiPaths.bookmarks()),
  });

  if (isError) {
    return (
      <Container size="2xl" className="space-y-10 py-10">
        <ErrorState
          page
          title="Couldn't load saved projects"
          message="Something went wrong while fetching your saved projects. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Container>
    );
  }

  if (isLoading || !data) {
    return (
      <Container size="2xl" className="space-y-10 py-10">
        <div className="h-40 animate-pulse rounded bg-line" />
      </Container>
    );
  }

  return (
    <Container size="2xl" className="space-y-10 py-10">
      <header>
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-blue">
          <Bookmark className="mr-1 inline h-3.5 w-3.5" strokeWidth={2.25} />
          Your account
        </span>
        <h1 className="mt-1 font-display text-display-lg tracking-[-0.02em] text-ink">
          Saved projects
        </h1>
        <p className="mt-2 max-w-prose text-body text-ink-2">
          Projects you have bookmarked. Tap the bookmark icon on any project to find it again here.
        </p>
      </header>

      {data.length === 0 ? (
        <EmptyState
          title="Nothing saved yet."
          description="Bookmark projects you want to keep an eye on and they will show up here."
          action={
            <Button asChild>
              <Link href={'/projects'}>
                <Compass className="h-4 w-4" strokeWidth={2.25} />
                Discover projects
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link key={p.id} href={`/projects/${p.slug}`} className="group block">
              <ProjectThumbnail
                thumbnailUrl={p.thumbnailUrl}
                thumbnailType={p.thumbnailType}
                alt={p.title}
              />
              <div className="mt-3 flex items-start justify-between gap-2">
                <h3 className="truncate font-display text-[16px] font-semibold text-ink">
                  {p.title}
                </h3>
                <PhaseBadge phase={p.phase} />
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{p.shortDescription}</p>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}

// Bounded on purpose: saved list mirrors the My work card grid
