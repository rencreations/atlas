'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Hash } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { channelHref } from '@/lib/chat/scope';
import { defaultChannelId } from '@/lib/chat/overview';
import { useChatOverview } from '@/lib/chat/use-chat-overview';
import { cn } from '@/lib/utils';

const TILE = 'relative grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors';
const ACTIVE_RING = 'ring-2 ring-brand-blue-strong ring-offset-2 ring-offset-surface-muted';

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -bottom-1 -right-1 inline-grid h-4 min-w-4 place-items-center rounded-full bg-brand-blue-strong px-1 text-[10px] font-medium leading-none text-white">
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

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/chat(\/|$)/);
  const activeProjectSlug = projectMatch ? projectMatch[1] : null;
  const isWorkspaceActive = !activeProjectSlug && pathname.startsWith('/chat');

  const workspaceChannelId = workspace ? defaultChannelId(workspace.channels) : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="flex w-14 shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-line bg-surface-muted/60 py-3 md:w-[72px]">
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
            >
              <Globe className="h-5 w-5" strokeWidth={2.25} />
            </RailTile>

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
                >
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt=""
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <Hash className="h-5 w-5 text-ink-3" strokeWidth={2.25} />
                  )}
                </RailTile>
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
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  unread: number;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href as never}
          aria-label={label}
          className={cn(
            TILE,
            'overflow-hidden bg-surface text-ink-3 hover:text-ink',
            active && ACTIVE_RING,
          )}
        >
          {children}
          <UnreadBadge count={unread} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
