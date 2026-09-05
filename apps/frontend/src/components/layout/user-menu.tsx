'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, Bookmark, Loader2, LogOut, Settings, ShieldCheck, User as UserIcon } from 'lucide-react';
import { clearSession, getStoredSession } from '@/lib/auth-client';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SessionUser } from '@/lib/types';

interface Props {
  isAdmin?: boolean;
}

export function UserMenu({ isAdmin }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const stored = getStoredSession()?.user;
  // The trigger avatar must react the instant the profile picture
  // changes (see settings/profile's syncAvatarEverywhere), but the
  // session in localStorage is a one-time snapshot from login that's
  // never rewritten afterward. Read the live profile via the same
  // query key that mutation updates instead, falling back to the
  // stored snapshot until it resolves.
  const { data: me } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<SessionUser>(apiPaths.me()),
    enabled: Boolean(stored),
    initialData: stored,
  });
  const user = me ?? stored;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'DELETE' });
    } catch {
      // Even if the API call fails (network/expired session), clear locally.
    }
    clearSession();
    router.push('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={user?.name ? `${user.name} menu` : 'Account menu'}
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Avatar src={user?.avatarUrl ?? undefined} name={user?.name ?? '?'} size={32} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5 normal-case tracking-normal">
            <span className="text-[13px] font-semibold text-ink">{user?.name ?? 'You'}</span>
            <span className="truncate text-[12px] font-normal text-ink-3">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={'/me' as never}>
            <UserIcon className="h-4 w-4 text-ink-2" strokeWidth={2.25} />
            Your dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={'/me/saved' as never}>
            <Bookmark className="h-4 w-4 text-ink-2" strokeWidth={2.25} />
            Saved projects
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={'/settings' as never}>
            <Settings className="h-4 w-4 text-ink-2" strokeWidth={2.25} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={'/settings/notifications' as never}>
            <Bell className="h-4 w-4 text-ink-2" strokeWidth={2.25} />
            Notification settings
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href={'/admin' as never}>
              <ShieldCheck className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
              Admin panel
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-brand-red"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
          ) : (
            <LogOut className="h-4 w-4" strokeWidth={2.25} />
          )}
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


// Keep in sync with the docs section on chat unread badge reconciliation

// The ordering here matters for email template localization
