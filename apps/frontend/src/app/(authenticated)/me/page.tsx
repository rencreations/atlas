'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Compass, Plus } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import { getStoredSession } from '@/lib/auth-client';
import { useCanCreateProject } from '@/lib/hooks/use-can-create-project';
import type { DashboardPayload, SessionUser } from '@/lib/types';
import { Container } from '@/components/layout/container';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProjectThumbnail, PhaseBadge } from '@/components/projects/project-thumbnail';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDueDate } from '@/components/pmo/date-picker-popover';
import { formatRelative, cn } from '@/lib/utils';

export default function MyDashboardPage() {
  usePageTitle('My work');

  const user = getStoredSession()?.user;
  const { canCreate: canCreateProject } = useCanCreateProject(user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const [meData, dashData] = await Promise.all([
        api<SessionUser & { lastLoginAt?: string; bio?: string | null }>(apiPaths.me()),
        api<DashboardPayload>(apiPaths.dashboard()),
      ]);
      return { me: meData, dash: dashData };
    },
  });

  if (isError) {
    return (
      <Container size="2xl" className="space-y-10 py-10">
        <ErrorState
          page
          title="Couldn't load your work"
          message="Something went wrong while fetching your projects and tasks. Check your connection and try again."
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

  const { me, dash } = data;

  // One flat list of everything the user is in, no matter the role.
  // The old Managing / Contributing split is gone: My work shows every
  // project the user is part of.
  const projects = [...dash.managed, ...dash.contributing];

  return (
    <Container size="2xl" className="space-y-10 py-10">
      <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={me.avatarUrl} name={me.name} size={64} />
          <div>
            <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">{me.name}</h1>
            <p className="text-body-sm text-ink-2">{me.email}</p>
            {me.isAdmin ? (
              <Badge tone="info" className="mt-2">
                Admin
              </Badge>
            ) : null}
          </div>
        </div>
        {canCreateProject ? (
          <Button asChild>
            <Link href={'/projects/new'}>
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              New project
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={'/projects'}>
              <Compass className="h-4 w-4" strokeWidth={2.25} />
              Discover projects
            </Link>
          </Button>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.12em] text-ink-3">My open tasks</h2>
        {!dash.myOpenTasks || dash.myOpenTasks.length === 0 ? (
          <p className="text-body-sm text-ink-3">No open tasks, nice.</p>
        ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {dash.myOpenTasks.map((t) => {
                const overdue = t.dueDate
                  ? new Date(t.dueDate) < new Date(new Date().toDateString())
                  : false;
                return (
                  <li key={t.id}>
                    <Link
                      href={
                        `/projects/${t.project.slug}/lists/${t.taskList.id}/tasks/${t.key}` as never
                      }
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted"
                    >
                      <code className="shrink-0 text-[12px] text-ink-3">{t.key}</code>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{t.title}</span>
                      <span className="hidden shrink-0 text-[12px] text-ink-3 sm:inline">
                        {t.project.title}
                      </span>
                      {t.dueDate ? (
                        <span
                          className={cn(
                            'shrink-0 text-[12px]',
                            overdue ? 'text-brand-red' : 'text-ink-3',
                          )}
                        >
                          {formatDueDate(t.dueDate)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.12em] text-ink-3">
          Projects
          <span className="ml-1.5 normal-case tracking-normal text-ink-3">{projects.length}</span>
        </h2>
        {projects.length === 0 ? (
          <EmptyState
            title="You're not part of any project yet."
            description="Discover a project that matches your skills and contribute to it."
            action={
              <Button asChild>
                <Link href={'/projects'}>
                  <Compass className="h-4 w-4" strokeWidth={2.25} />
                  Discover a project
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.slug}`} className="group block">
                <ProjectThumbnail
                  thumbnailUrl={p.thumbnailUrl}
                  thumbnailType={p.thumbnailType}
                  alt={p.title}
                />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-[16px] font-semibold text-ink">
                      {p.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">
                      {p.shortDescription}
                    </p>
                  </div>
                  <PhaseBadge phase={p.phase} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {dash.pendingRequests.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.12em] text-ink-3">
            Pending requests
          </h2>
          <ul className="space-y-3">
            {dash.pendingRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start gap-4 rounded-lg border border-line bg-surface p-5"
              >
                <div className="flex-1">
                  <Link
                    href={`/projects/${r.project.slug}`}
                    className="font-display text-[16px] font-semibold text-ink hover:text-brand-blue"
                  >
                    {r.project.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink-2">
                    Applied as <span className="font-medium text-ink">{r.role}</span> ·{' '}
                    {formatRelative(r.createdAt)}
                  </p>
                  {r.message ? (
                    <p className="mt-2 line-clamp-2 text-[13px] text-ink-3">{r.message}</p>
                  ) : null}
                </div>
                <Badge tone="warning" uppercase>
                  Pending
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}

// Keep in sync with the docs section on project discovery ranking
