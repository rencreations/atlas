'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Inbox,
  LoaderCircle,
  MessageSquare,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { usePageTitle } from '@/lib/page-title';
import { getStoredSession } from '@/lib/auth-client';
import type { ForMePayload, ForMeTask } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/layout/container';
import { ErrorState } from '@/components/ui/error-state';
import { formatRelative, cn } from '@/lib/utils';

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function ForMePage() {
  usePageTitle('For me');
  const session = getStoredSession();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.forMe,
    queryFn: () => api<ForMePayload>(apiPaths.forMe()),
  });

  const firstName = session?.user.name?.split(' ')[0] ?? '';

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Container className="py-10">
      <div className="mb-8 flex items-center gap-4">
        <Avatar src={session?.user.avatarUrl ?? undefined} name={session?.user.name ?? '?'} size={48} />
        <div>
          <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-body-sm text-ink-3">{today}, here&apos;s what needs you.</p>
        </div>
      </div>

      {isError ? (
        <ErrorState
          page
          title="Couldn't load your queue"
          message="Something went wrong while fetching your tasks and activity. Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : isLoading || !data ? (
        <div className="flex justify-center py-24">
          <LoaderCircle className="h-6 w-6 animate-spin text-ink-3" strokeWidth={2.25} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* ─── Left: work ─── */}
          <div className="flex min-w-0 flex-col gap-6">
            <TaskSection
              title="Due today"
              icon={<CalendarClock className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />}
              tasks={data.tasks.dueToday}
              empty="Nothing due today."
              tone="blue"
            />
            <TaskSection
              title="Overdue"
              icon={<Clock className="h-4 w-4 text-brand-red" strokeWidth={2.25} />}
              tasks={data.tasks.overdue}
              empty="Nothing overdue. Nice."
              tone="red"
            />
            <TaskSection
              title="Open work"
              icon={<Circle className="h-4 w-4 text-ink-3" strokeWidth={2.25} />}
              tasks={data.tasks.open}
              empty="No open tasks assigned to you."
              tone="neutral"
            />

            <Card>
              <CardBody>
                <CardTitle>Recent activity</CardTitle>
                {data.recentActivity.length === 0 ? (
                  <p className="mt-3 text-[13.5px] text-ink-3">No recent activity on your work.</p>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    {data.recentActivity.map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <Avatar
                          src={a.actor?.avatarUrl ?? undefined}
                          name={a.actor?.name ?? 'System'}
                          size={28}
                        />
                        <div className="min-w-0">
                          <p className="text-[13.5px] text-ink-2">
                            <span className="font-medium text-ink">{a.actor?.name ?? 'System'}</span>{' '}
                            {activityVerb(a.kind)}
                            {a.task ? (
                              <Link
                                href={
                                  `/projects/${a.task.project.slug}/lists/${a.task.taskList.id}/tasks/${a.task.key}` as never
                                }
                                className="-my-2 ml-1 inline-block py-2 font-medium text-brand-blue hover:underline"
                              >
                                {a.task.key}
                              </Link>
                            ) : null}
                          </p>
                          {a.task ? (
                            <p className="truncate text-[12.5px] text-ink-4">{a.task.title}</p>
                          ) : null}
                          <p className="text-[12px] text-ink-4">{formatRelative(a.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ─── Right: attention ─── */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardBody>
                <CardTitle>Unread</CardTitle>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href={'/notifications' as never}
                    className="flex items-center justify-between rounded border border-line px-4 py-3 transition-colors duration-120 hover:bg-surface-muted"
                  >
                    <span className="flex items-center gap-2.5 text-[14px] text-ink">
                      <Bell className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
                      Notifications
                    </span>
                    {data.notifications.unread > 0 ? (
                      <Badge tone="info">{data.notifications.unread} new</Badge>
                    ) : (
                      <Badge tone="outline">all read</Badge>
                    )}
                  </Link>
                  {data.chatUnread.map((c) => (
                    <Link
                      key={c.channelId}
                      href={
                        c.projectSlug
                          ? (`/projects/${c.projectSlug}/chat/${c.channelId}` as never)
                          : (`/chat/global/${c.channelId}` as never)
                      }
                      className="flex items-center justify-between rounded border border-line px-4 py-3 transition-colors duration-120 hover:bg-surface-muted"
                    >
                      <span className="flex min-w-0 items-center gap-2.5 text-[14px] text-ink">
                        <MessageSquare className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2.25} />
                        <span className="truncate">#{c.name}</span>
                      </span>
                      <Badge tone="info">{c.unread}</Badge>
                    </Link>
                  ))}
                  {data.notifications.unread === 0 && data.chatUnread.length === 0 ? (
                    <p className="px-1 text-[13.5px] text-ink-3">You&apos;re all caught up. ✨</p>
                  ) : null}
                </div>
              </CardBody>
            </Card>

            {(data.invites.length > 0 || data.pendingRequests.length > 0) && (
              <Card>
                <CardBody>
                  <CardTitle>Needs your attention</CardTitle>
                  <div className="mt-3 flex flex-col gap-2">
                    {data.invites.map((i) => (
                      <Link
                        key={i.id}
                        href={`/projects/${i.project.slug}` as never}
                        className="flex items-center gap-3 rounded border border-line px-4 py-3 transition-colors duration-120 hover:bg-surface-muted"
                      >
                        <UserPlus className="h-4 w-4 shrink-0 text-brand-green" strokeWidth={2.25} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] text-ink">
                            Invited to {i.project.title}
                          </span>
                          <span className="block text-[12.5px] text-ink-3">
                            as {i.title ?? i.role.toLowerCase()}
                          </span>
                        </span>
                      </Link>
                    ))}
                    {data.pendingRequests.map((r) => (
                      <Link
                        key={r.id}
                        href={`/projects/${r.project.slug}` as never}
                        className="flex items-center gap-3 rounded border border-line px-4 py-3 transition-colors duration-120 hover:bg-surface-muted"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 text-brand-yellow" strokeWidth={2.25} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] text-ink">
                            Pending request, {r.project.title}
                          </span>
                          <span className="block text-[12.5px] text-ink-3">for {r.role}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody>
                <CardTitle>Quick links</CardTitle>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Link href={'/projects' as never} className="-my-1.5 flex items-center gap-2.5 py-1.5 text-[14px] text-ink hover:text-brand-blue">
                    <Inbox className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
                    Discover projects
                  </Link>
                  <Link href={'/notifications' as never} className="-my-1.5 flex items-center gap-2.5 py-1.5 text-[14px] text-ink hover:text-brand-blue">
                    <Bell className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
                    Notification inbox
                  </Link>
                  <Link href={'/me' as never} className="-my-1.5 flex items-center gap-2.5 py-1.5 text-[14px] text-ink hover:text-brand-blue">
                    <CheckCircle2 className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
                    My work
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Container>
  );
}

function TaskSection({
  title,
  icon,
  tasks,
  empty,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: ForMeTask[];
  empty: string;
  tone: 'blue' | 'red' | 'neutral';
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          {tasks.length > 0 ? <Badge tone={tone === 'red' ? 'danger' : 'info'}>{tasks.length}</Badge> : null}
        </div>
        {tasks.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-3">{empty}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1">
            {tasks.map((t) => (
              <Link
                key={t.id}
                href={`/projects/${t.project.slug}/lists/${t.taskList.id}/tasks/${t.key}` as never}
                className={cn(
                  'flex items-center gap-3 rounded px-3 py-2.5 transition-colors duration-120 hover:bg-surface-muted',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    t.status.category === 'IN_PROGRESS' ? 'bg-brand-blue-strong' : 'bg-line-strong',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">
                    <span className="font-mono text-[12.5px] text-ink-3">{t.key}</span>{' '}
                    {t.title}
                  </span>
                  <span className="block text-[12.5px] text-ink-3">
                    {t.project.title} · {t.status.name}
                  </span>
                </span>
                <span className="shrink-0">
                  {t.priority && t.priority !== 'NONE' ? (
                    <Badge tone={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : 'neutral'}>
                      {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </Badge>
                  ) : null}
                </span>
                {t.dueDate ? (
                  <span className="shrink-0 text-[12px] text-ink-4 tnum">
                    {new Date(t.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function activityVerb(kind: string): string {
  switch (kind) {
    case 'COMMENT_ADDED':
      return 'commented on';
    case 'STATUS_CHANGED':
      return 'moved';
    case 'ASSIGNED':
      return 'was assigned to';
    case 'UNASSIGNED':
      return 'was unassigned from';
    case 'CREATED':
      return 'created';
    case 'COMPLETED':
      return 'completed';
    case 'REOPENED':
      return 'reopened';
    case 'DUE_DATE_SET':
      return 'set a due date on';
    case 'MENTIONED':
      return 'was mentioned in';
    case 'PRIORITY_CHANGED':
      return 'reprioritized';
    case 'RENAMED':
      return 'renamed';
    default:
      return 'updated';
  }
}
