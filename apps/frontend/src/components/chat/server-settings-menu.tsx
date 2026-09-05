'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Copy,
  LogOut,
  MoreVertical,
  Settings,
  ShieldCheck,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { useChatOverview } from '@/lib/chat/use-chat-overview';
import type { ChatScope } from '@/lib/chat/scope';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';

interface MenuProps {
  scope: ChatScope;
  /** Workspace admin (only meaningful for scope.kind === 'global'). */
  isAdmin: boolean;
  /** Project manager, already true for instance admins (only meaningful for scope.kind === 'project'). */
  isManager: boolean;
}

/** Current mute state for this scope, read from the same overview query the rail uses. */
function useServerMute(scope: ChatScope) {
  const { workspace, projects } = useChatOverview();
  const qc = useQueryClient();
  const muted =
    scope.kind === 'global'
      ? (workspace?.chatMuted ?? false)
      : (projects.find((p) => p.slug === scope.slug)?.chatMuted ?? false);

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      api(
        scope.kind === 'global'
          ? apiPaths.chat.muteWorkspace()
          : apiPaths.chat.muteProject(scope.slug),
        { method: 'PATCH', body: { muted: next } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.chat.myProjects });
    },
  });

  return { muted, toggle: () => mutation.mutate(!muted), isPending: mutation.isPending };
}

/**
 * Discord-style server settings, scoped to the viewer's role. Shared
 * between the channel-list header's "..." trigger and the rail's
 * right-click context menu so both surfaces show the same items.
 */
export function ServerSettingsMenuItems({ scope, isAdmin, isManager }: MenuProps) {
  const { show } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const { muted, toggle, isPending } = useServerMute(scope);
  const [leaveOpen, setLeaveOpen] = React.useState(false);

  const leaveMutation = useMutation({
    mutationFn: () => {
      if (scope.kind !== 'project') throw new Error('The workspace cannot be left.');
      return api(apiPaths.leaveProject(scope.slug), { method: 'POST' });
    },
    onSuccess: () => {
      setLeaveOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.chat.myProjects });
      show({ tone: 'success', title: 'Left the project' });
      router.push('/chat' as never);
    },
    onError: (err) =>
      show({
        tone: 'danger',
        title: 'Could not leave',
        description:
          (err as { body?: { message?: string } })?.body?.message ??
          (err instanceof Error ? err.message : 'Failed to leave the project.'),
      }),
  });

  const copyLink = () => {
    if (scope.kind !== 'project' || typeof window === 'undefined') return;
    void navigator.clipboard.writeText(`${window.location.origin}/projects/${scope.slug}`);
    show({ tone: 'success', title: 'Project link copied' });
  };

  return (
    <>
      {scope.kind === 'project' ? (
        <DropdownMenuItem onSelect={copyLink} className="gap-2">
          <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
          Copy project link
        </DropdownMenuItem>
      ) : null}

      {scope.kind === 'project' && isManager ? (
        <DropdownMenuItem asChild className="gap-2">
          <Link href={`/projects/${scope.slug}/manage?tab=team` as never}>
            <UserPlus className="h-3.5 w-3.5" strokeWidth={2.25} />
            Invite people
          </Link>
        </DropdownMenuItem>
      ) : null}

      <DropdownMenuItem asChild className="gap-2">
        <Link href={'/settings/notifications' as never}>
          <Bell className="h-3.5 w-3.5" strokeWidth={2.25} />
          Notification settings
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem
        disabled={isPending}
        onSelect={(e) => {
          e.preventDefault();
          toggle();
        }}
        className="gap-2"
      >
        {muted ? (
          <Volume2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        ) : (
          <VolumeX className="h-3.5 w-3.5" strokeWidth={2.25} />
        )}
        {muted ? 'Unmute' : 'Mute'} {scope.kind === 'global' ? 'workspace' : 'project'}
      </DropdownMenuItem>

      {scope.kind === 'project' && isManager ? (
        <DropdownMenuItem asChild className="gap-2">
          <Link href={`/projects/${scope.slug}/manage` as never}>
            <Settings className="h-3.5 w-3.5" strokeWidth={2.25} />
            Manage project
          </Link>
        </DropdownMenuItem>
      ) : null}

      {scope.kind === 'global' && isAdmin ? (
        <DropdownMenuItem asChild className="gap-2">
          <Link href={'/admin' as never}>
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
            Manage instance
          </Link>
        </DropdownMenuItem>
      ) : null}

      {scope.kind === 'project' ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setLeaveOpen(true);
            }}
            className="gap-2 text-brand-red focus:text-brand-red"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
            Leave project
          </DropdownMenuItem>
        </>
      ) : null}

      {scope.kind === 'project' ? (
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent size="sm">
            <DialogTitle>Leave this project?</DialogTitle>
            <DialogDescription>
              You&apos;ll lose access to its chat, tasks, and files. A manager can invite you
              back later.
            </DialogDescription>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={leaveMutation.isPending}
                onClick={() => leaveMutation.mutate()}
              >
                Leave project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/** Visible "..." trigger, used at the top of the channel-list header. */
export function ServerSettingsMenuButton({ scope, isAdmin, isManager }: MenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Server settings"
          onClick={(e) => e.stopPropagation()}
          className="inline-grid h-6 w-6 shrink-0 place-items-center rounded text-ink-3 hover:bg-surface hover:text-ink"
        >
          <MoreVertical className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ServerSettingsMenuItems scope={scope} isAdmin={isAdmin} isManager={isManager} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Right-click wrapper for a rail tile: renders `children` untouched (so
 * left-click navigation via the tile's own Link is unaffected) plus an
 * invisible, pointer-events-none anchor that Radix uses purely to
 * position the menu; opening is driven entirely by onContextMenu.
 */
export function ServerContextMenu({
  scope,
  isAdmin,
  isManager,
  children,
}: MenuProps & { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        className="relative inline-grid"
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
        <DropdownMenuTrigger asChild>
          <span className="pointer-events-none absolute inset-0" aria-hidden="true" />
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="start" side="right">
        <ServerSettingsMenuItems scope={scope} isAdmin={isAdmin} isManager={isManager} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
