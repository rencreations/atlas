'use client';

import * as React from 'react';
import Link from 'next/link';
import { BellOff, Check, Inbox, Loader2, Sparkles } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import type { NotificationItem, Paginated } from '@/lib/types';
import { cn, formatRelative } from '@/lib/utils';
import { BellIcon } from '@/components/icons/animated/bell';
import { ATLAS_TITLE_EVENT, getPageTitleBase } from '@/lib/page-title';
import { usePushPermission } from '@/lib/notifications/use-push-permission';
import { useToast } from '@/components/ui/toast';

export function NotificationBell() {
  const qc = useQueryClient();
  const { permission, busy: enabling, enable } = usePushPermission();
  const { show } = useToast();
  // Live-invalidated by NotificationsClient on socket events, so we
  // don't need to poll. Keep a long staleTime so route changes don't
  // re-fetch, the socket is the source of truth.
  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api<{ unread: number }>(apiPaths.unreadCount()),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
  const list = useQuery({
    queryKey: ['notifications', 1],
    queryFn: () => api<Paginated<NotificationItem>>(apiPaths.notifications(1)),
    enabled: false, // only fetched when popover opens
  });

  const count = unread.data?.unread ?? 0;

  const markAll = useMutation({
    mutationFn: () => api(apiPaths.markAllRead(), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () =>
      show({
        tone: 'danger',
        title: 'Could not mark all as read',
        description: 'Try again in a moment.',
      }),
  });

  // Live-update the tab title with an "(N) " prefix when there are
  // unread notifications. Restore the original title when the user
  // returns to this tab or unread drops to 0. Bookends the bell badge:
  // people glance at their tab strip more often than the bell icon.
  // Reads the base title through the page-title module (and re-applies
  // on its change event) so per-page titles keep the prefix on navigation.
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const sync = () => {
      const base =
        getPageTitleBase() || document.title.replace(/^\(\d+\)\s+/, '');
      document.title = count > 0 ? `(${count > 99 ? '99+' : count}) ${base}` : base;
    };
    sync();
    window.addEventListener(ATLAS_TITLE_EVENT, sync);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener(ATLAS_TITLE_EVENT, sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count]);

  const onEnableClicked = async () => {
    const result = await enable();
    if (result.ok) {
      show({ title: 'Browser notifications enabled', tone: 'success' });
    } else if (result.reason === 'permission-denied') {
      show({
        title: 'Notifications blocked',
        description: 'Re-enable them from your browser site settings.',
        tone: 'warning',
      });
    } else if (result.reason === 'not-configured') {
      show({ title: 'Push not configured yet', tone: 'warning' });
    } else if (result.reason === 'unsupported') {
      show({
        title: 'Browser doesn’t support push',
        description: 'On iOS, install Atlas to your home screen first.',
        tone: 'info',
      });
    }
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) list.refetch();
      }}
    >
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifications${count ? ` (${count} unread)` : ''}`}
          className={cn(
            'relative inline-grid h-9 w-9 place-items-center rounded text-ink md:h-10 md:w-10',
            'hover:bg-surface-muted',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          )}
        >
          <BellIcon size={20} className="flex items-center justify-center" />
          {count > 0 ? (
            <span className="absolute right-1.5 top-1.5 inline-grid min-w-[18px] place-items-center rounded-full bg-brand-red-strong px-1 text-[11px] font-medium leading-none text-white">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[14px] font-medium text-ink">Notifications</span>
          {count > 0 ? (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-blue hover:underline disabled:opacity-60"
            >
              {markAll.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
              )}
              {markAll.isPending ? 'Marking…' : 'Mark all read'}
            </button>
          ) : null}
        </div>

        {permission === 'default' || permission === 'denied' ? (
          <div className="flex items-start gap-3 border-b border-line bg-brand-blue-50/40 px-4 py-3">
            {permission === 'denied' ? (
              <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" strokeWidth={2.25} />
            ) : (
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" strokeWidth={2.25} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-ink">
                {permission === 'denied'
                  ? 'Browser notifications are blocked.'
                  : 'Get pushed to your device when you’re mentioned.'}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                {permission === 'default' ? (
                  <button
                    onClick={onEnableClicked}
                    disabled={enabling}
                    className="text-[12px] font-medium text-brand-blue hover:underline disabled:opacity-60"
                  >
                    {enabling ? 'Enabling…' : 'Enable browser notifications'}
                  </button>
                ) : (
                  <Link
                    href={'/me/notifications' as never}
                    className="text-[12px] font-medium text-brand-blue hover:underline"
                  >
                    Open settings
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="max-h-[420px] overflow-y-auto">
          {list.isError ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-ink-3">
              <span className="text-[13px]">Couldn&apos;t load notifications.</span>
              <button
                onClick={() => list.refetch()}
                className="text-[13px] font-medium text-brand-blue hover:underline"
              >
                Try again
              </button>
            </div>
          ) : list.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded" />
              ))}
            </div>
          ) : (list.data?.items?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-ink-3">
              <Inbox className="h-6 w-6" strokeWidth={2.25} />
              <span className="text-[13px]">You&apos;re all caught up.</span>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {list.data!.items.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <Link
                    href={(n.link ?? '/dashboard') as never}
                    className={cn(
                      'block px-4 py-3 transition-colors hover:bg-surface-muted',
                      n.readAt ? 'opacity-70' : '',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!n.readAt ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-blue-strong" />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-ink">{n.title}</div>
                        <p className="line-clamp-2 text-[13px] text-ink-2">{n.body}</p>
                        <span className="mt-1 block text-[12px] text-ink-3">
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-2">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link href={'/notifications' as never}>View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Deliberately conservative here; tighten once gallery fractional reordering has data behind it

// See the incident notes for release-please tag drift before changing defaults
