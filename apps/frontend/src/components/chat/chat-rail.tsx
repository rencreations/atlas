'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { channelHref } from '@/lib/chat/scope';
import { defaultChannelId } from '@/lib/chat/overview';
import { useChatOverview } from '@/lib/chat/use-chat-overview';
import { chatAvatarFor, chatAvatarKey } from '@/lib/chat/avatar';
import { getStoredSession } from '@/lib/auth-client';
import { ChatAvatarEditPopover } from './chat-avatar-edit-popover';
import { cn } from '@/lib/utils';
import type { ChatAvatarInfo } from '@/lib/types';

const TILE = 'relative grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors';
const ACTIVE_RING = 'ring-2 ring-brand-blue-strong ring-offset-2 ring-offset-surface-muted';

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    // Sits outside the tile's overflow-hidden clip so the pill is never
    // cut off by the avatar circle; z-10 keeps it above the tile.
    <span className="absolute -bottom-1 -right-1 z-10 inline-grid h-4 min-w-4 place-items-center rounded-full bg-brand-blue-strong px-1 text-[10px] font-medium leading-none text-white shadow-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Discord-style server rail: the Workspace (global channels) pinned
 * first, then one tile per project the user has chat access to. Shared
 * by every chat surface (the standalone /chat app and every project's
 * own Chat tab) via ChatShell, so switching "servers" never leaves chat.
 */
export function ChatRail() {
  const pathname = usePathname() ?? '';
  const { overview, projects, workspace } = useChatOverview();
  const isAdmin = getStoredSession()?.user.isAdmin === true;

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/chat(\/|$)/);
  const activeProjectSlug = projectMatch ? projectMatch[1] : null;
  const isWorkspaceActive = !activeProjectSlug && pathname.startsWith('/chat');

  const workspaceChannelId = workspace ? defaultChannelId(workspace.channels) : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="scroll-hidden flex w-14 shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-line bg-surface-muted/60 py-3 md:w-[72px]">
        {overview.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn(TILE, 'animate-pulse bg-line/50')} />
          ))
        ) : (
          <>
            <RailTile
              href={workspaceChannelId ? `/chat/global/${workspaceChannelId}` : '/chat'}
              active={isWorkspaceActive}
              label="Workspace"
              unread={workspace?.unread ?? 0}
              avatar={chatAvatarFor('workspace', workspace?.avatar)}
              editable={
                isAdmin
                  ? { avatarKey: chatAvatarKey('workspace'), seed: 'workspace', avatar: workspace?.avatar }
                  : undefined
              }
            />

            {projects.length > 0 ? <div className="h-px w-8 shrink-0 bg-line" /> : null}

            {projects.map((p) => {
              const channelId = defaultChannelId(p.channels);
              const href = channelId
                ? channelHref({ kind: 'project', slug: p.slug }, channelId)
                : `/projects/${p.slug}/chat`;
              return (
                <RailTile
                  key={p.id}
                  href={href}
                  active={activeProjectSlug === p.slug}
                  label={p.title}
                  unread={p.unread}
                  avatar={chatAvatarFor(p.slug, p.avatar)}
                  editable={
                    isAdmin
                      ? { avatarKey: chatAvatarKey('project', p.id), seed: p.slug, avatar: p.avatar }
                      : undefined
                  }
                />
              );
            })}
          </>
        )}
      </nav>
    </TooltipProvider>
  );
}

function RailTile({
  href,
  active,
  label,
  unread,
  avatar,
  editable,
}: {
  href: string;
  active: boolean;
  label: string;
  unread: number;
  avatar: { emoji: string; color: string; imageUrl: string | null };
  /** Admin-only: renders a small edit badge that opens the avatar editor inline. */
  editable?: { avatarKey: string; seed: string; avatar: ChatAvatarInfo | null | undefined };
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="group relative inline-grid">
          <Link
            href={href as never}
            aria-label={label}
            className={cn(
              TILE,
              'overflow-hidden text-ink-3 hover:text-ink',
              active && ACTIVE_RING,
            )}
          >
            {avatar.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className="grid h-full w-full place-items-center text-[20px] leading-none"
                style={{ backgroundColor: avatar.color }}
                aria-hidden
              >
                {avatar.emoji}
              </span>
            )}
          </Link>
          <UnreadBadge count={unread} />
          {editable ? (
            <ChatAvatarEditPopover
              avatarKey={editable.avatarKey}
              seed={editable.seed}
              title={label}
              avatar={editable.avatar}
            />
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
