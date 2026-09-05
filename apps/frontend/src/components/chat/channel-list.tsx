'use client';

import * as React from 'react';
import Link from 'next/link';
import { Globe, Hash, Lock, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { getStoredSession } from '@/lib/auth-client';
import { channelHref, type ChatScope } from '@/lib/chat/scope';
import { useChatOverview } from '@/lib/chat/use-chat-overview';
import { chatAvatarFor } from '@/lib/chat/avatar';
import { ServerSettingsMenuButton } from './server-settings-menu';
import { useVoiceEnabled } from '@/lib/hooks/use-voice-enabled';
import { getVoiceSocket } from '@/lib/realtime/socket';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ChatChannel } from '@/lib/types';
import type { VoiceChannelWithRoster } from '@/lib/voice/types';
import { VoiceChannelRow } from '@/components/voice/voice-channel-row';
import { CreateVoiceChannelButton } from '@/components/voice/voice-channel-actions';

interface Props {
  scope: ChatScope;
  /** Shown in the sidebar header for project scope. */
  projectTitle?: string;
  activeChannelId: string;
  /** Project-manager flag (project scope). Workspace admin gates are derived from the session. */
  canManage: boolean;
}

export function ChannelList({ scope, projectTitle, activeChannelId, canManage }: Props) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface-muted/40">
      {/* Each "server" shows only its own channels now that the rail
          makes every other server one click away (real Discord behavior). */}
      {scope.kind === 'global' ? (
        <WorkspaceSection activeChannelId={activeChannelId} />
      ) : (
        <ProjectSection
          projectSlug={scope.slug}
          projectTitle={projectTitle ?? ''}
          activeChannelId={activeChannelId}
          canManage={canManage}
        />
      )}
    </aside>
  );
}

/**
 * Pinned workspace-global section, rendered at the top of EVERY chat
 * sidebar (and alone on the global chat page) so global channels are
 * always one click away and visually distinct from project channels.
 * Globe + eyebrow mirror the voice-lobby header treatment.
 */
function WorkspaceSection({ activeChannelId }: { activeChannelId: string }) {
  const voiceEnabled = useVoiceEnabled();
  const isAdmin = getStoredSession()?.user.isAdmin === true;
  const queryClient = useQueryClient();
  // Reuses the rail's overview query (deduped by React Query) for the
  // workspace avatar tile in this sidebar header.
  const { workspace } = useChatOverview();
  const workspaceAvatar = chatAvatarFor('workspace', workspace?.avatar);

  const globalChannelsQuery = useQuery({
    queryKey: queryKeys.chat.globalChannels,
    queryFn: () => api<ChatChannel[]>(apiPaths.chat.globalChannels()),
    refetchOnWindowFocus: false,
  });

  const lobbyQuery = useQuery({
    queryKey: queryKeys.voice.lobby,
    queryFn: () =>
      api<{ items: VoiceChannelWithRoster[] }>(apiPaths.voice.lobbyChannels()).then(
        (r) => r.items,
      ),
    refetchOnWindowFocus: false,
    enabled: voiceEnabled,
  });

  // Keep the lobby avatar stacks live, same subscription the voice
  // lobby page uses.
  React.useEffect(() => {
    if (!voiceEnabled) return;
    const socket = getVoiceSocket();
    if (!socket) return;
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.voice.lobby });
    };
    const onConnect = () => {
      socket.emit('voice:subscribe.lobby');
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('voice.roster.update', invalidate);
    socket.on('voice.channel.created', invalidate);
    socket.on('voice.channel.updated', invalidate);
    socket.on('voice.channel.archived', invalidate);
    return () => {
      socket.off('connect', onConnect);
      socket.off('voice.roster.update', invalidate);
      socket.off('voice.channel.created', invalidate);
      socket.off('voice.channel.updated', invalidate);
      socket.off('voice.channel.archived', invalidate);
    };
  }, [voiceEnabled, queryClient]);

  const globalChannels = (globalChannelsQuery.data ?? []).filter((c) => !c.isArchived);
  const lobbyChannels = (lobbyQuery.data ?? []).filter((c) => !c.archivedAt);
  // Per-channel unread counts, already computed by the same overview
  // query the rail's aggregate badge and the workspace avatar use above
  // - no extra fetch needed.
  const unreadByChannel = new Map((workspace?.channels ?? []).map((c) => [c.id, c.unread]));

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <ServerAvatarTile
          emoji={workspaceAvatar.emoji}
          color={workspaceAvatar.color}
          imageUrl={workspaceAvatar.imageUrl}
        />
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-brand-blue">
          <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          <span className="truncate">Workspace</span>
        </span>
        <ServerSettingsMenuButton scope={{ kind: 'global' }} isAdmin={isAdmin} isManager={false} />
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Channels
        </span>
        {isAdmin ? <CreateChannelButton scope={{ kind: 'global' }} /> : null}
      </div>

      {/* Everything below the headers scrolls internally so a long
          channel/voice-lobby list never silently overflows the sidebar
          (the header rows above stay put, matching ProjectSection). */}
      <nav className="scroll-hidden flex-1 overflow-y-auto pb-3">
        <ul className="space-y-0.5 px-2">
          {globalChannelsQuery.isLoading ? (
            <li className="space-y-0.5">
              <div className="h-8 animate-pulse rounded bg-surface-muted" />
              <div className="h-8 animate-pulse rounded bg-surface-muted" />
            </li>
          ) : globalChannelsQuery.isError ? (
            <li className="px-2 py-1.5 text-[12px] text-brand-red">
              Couldn&apos;t load workspace channels.{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => void globalChannelsQuery.refetch()}
              >
                Try again
              </button>
            </li>
          ) : (
            globalChannels.map((c) => (
              <ChannelRow
                key={c.id}
                channel={c}
                href={channelHref({ kind: 'global' }, c.id)}
                active={c.id === activeChannelId}
                unread={unreadByChannel.get(c.id) ?? 0}
              />
            ))
          )}
        </ul>
        {voiceEnabled ? (
          <>
            <div className="mt-4 flex items-center justify-between gap-2 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              <span>Voice</span>
              {isAdmin ? <CreateVoiceChannelButton label="New lobby voice channel" /> : null}
            </div>
            {lobbyQuery.isLoading ? (
              <ul className="mt-1 space-y-0.5 px-2">
                <li className="h-8 animate-pulse rounded bg-surface-muted" />
              </ul>
            ) : lobbyQuery.isError ? (
              <div className="mt-1 px-2 py-1.5 text-[12px] text-brand-red">
                Couldn&apos;t load voice channels.{' '}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => void lobbyQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : lobbyChannels.length > 0 ? (
              <ul className="mt-1 space-y-0.5 px-2">
                {lobbyChannels.map((c) => (
                  <li key={c.id}>
                    <VoiceChannelRow channel={c} href={`/voice/${c.id}`} canManage={isAdmin} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 px-2 py-1.5 text-[11px] text-ink-3">
                {isAdmin ? 'No voice channels yet. Click + to add one.' : 'No voice channels yet.'}
              </div>
            )}
          </>
        ) : null}
      </nav>
    </>
  );
}

function ProjectSection({
  projectSlug,
  projectTitle,
  activeChannelId,
  canManage,
}: {
  projectSlug: string;
  projectTitle: string;
  activeChannelId: string;
  canManage: boolean;
}) {
  const voiceEnabled = useVoiceEnabled();
  const queryClient = useQueryClient();
  // Reuses the rail's overview query (deduped by React Query) for
  // per-channel unread counts below, same as the workspace section.
  const { projects: overviewProjects } = useChatOverview();
  const channelsQuery = useQuery({
    queryKey: queryKeys.chat.channels(projectSlug),
    queryFn: () => api<ChatChannel[]>(apiPaths.chat.channels(projectSlug)),
    refetchOnWindowFocus: false,
  });

  const voiceChannelsQuery = useQuery({
    queryKey: queryKeys.voice.channels(projectSlug),
    queryFn: () =>
      api<{ items: VoiceChannelWithRoster[] }>(apiPaths.voice.channels(projectSlug)).then(
        (r) => r.items,
      ),
    refetchOnWindowFocus: false,
    enabled: voiceEnabled,
  });

  // Subscribe to project-level voice events so the roster / channel
  // list stays live. The socket invalidates the voice-channels query
  // on every roster / channel change, TanStack Query then refetches.
  React.useEffect(() => {
    if (!voiceEnabled) return;
    const socket = getVoiceSocket();
    if (!socket) return;
    const invalidate = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.voice.channels(projectSlug),
      });
    };
    const onConnect = () => {
      socket.emit('voice:subscribe.project', { projectId: projectSlug });
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('voice.roster.update', invalidate);
    socket.on('voice.channel.created', invalidate);
    socket.on('voice.channel.updated', invalidate);
    socket.on('voice.channel.archived', invalidate);
    return () => {
      socket.off('connect', onConnect);
      socket.off('voice.roster.update', invalidate);
      socket.off('voice.channel.created', invalidate);
      socket.off('voice.channel.updated', invalidate);
      socket.off('voice.channel.archived', invalidate);
    };
  }, [voiceEnabled, projectSlug, queryClient]);

  const channels = channelsQuery.data ?? [];
  const active = channels.filter((c) => !c.isArchived);
  const archived = channels.filter((c) => c.isArchived);
  const voiceChannels = (voiceChannelsQuery.data ?? []).filter((c) => !c.archivedAt);
  const overviewProject = overviewProjects.find((p) => p.slug === projectSlug);
  const unreadByChannel = new Map(
    (overviewProject?.channels ?? []).map((c) => [c.id, c.unread]),
  );

  return (
    <>
      <div className="border-b border-line px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Project
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <ProjectAvatarTile projectSlug={projectSlug} />
          <div className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
            {projectTitle}
          </div>
          <ServerSettingsMenuButton
            scope={{ kind: 'project', slug: projectSlug }}
            isAdmin={false}
            isManager={canManage}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Channels
        </span>
        {canManage ? <CreateChannelButton scope={{ kind: 'project', slug: projectSlug }} /> : null}
      </div>

      <nav className="scroll-hidden flex-1 overflow-y-auto px-2 pb-3">
        {channelsQuery.isLoading ? (
          <ul className="space-y-0.5">
            <li className="h-8 animate-pulse rounded bg-surface-muted" />
            <li className="h-8 animate-pulse rounded bg-surface-muted" />
            <li className="h-8 animate-pulse rounded bg-surface-muted" />
          </ul>
        ) : channelsQuery.isError ? (
          <div className="px-2 py-1.5 text-[12px] text-brand-red">
            Couldn&apos;t load channels.{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => void channelsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {active.map((c) => (
                <ChannelRow
                  key={c.id}
                  channel={c}
                  href={channelHref({ kind: 'project', slug: projectSlug }, c.id)}
                  active={c.id === activeChannelId}
                  unread={unreadByChannel.get(c.id) ?? 0}
                />
              ))}
            </ul>

            {archived.length > 0 ? (
              <>
                <div className="mt-4 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  Archived
                </div>
                <ul className="mt-1 space-y-0.5">
                  {archived.map((c) => (
                    <ChannelRow
                      key={c.id}
                      channel={c}
                      href={channelHref({ kind: 'project', slug: projectSlug }, c.id)}
                      active={c.id === activeChannelId}
                      unread={unreadByChannel.get(c.id) ?? 0}
                    />
                  ))}
                </ul>
              </>
            ) : null}

            {voiceEnabled ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-2 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  <span>Voice</span>
                  {canManage ? (
                    <CreateVoiceChannelButton projectSlugOrId={projectSlug} />
                  ) : null}
                </div>
                {voiceChannelsQuery.isLoading ? (
                  <div className="mt-1 h-8 animate-pulse rounded bg-surface-muted" />
                ) : voiceChannelsQuery.isError ? (
                  <div className="mt-1 px-2 py-1.5 text-[12px] text-brand-red">
                    Couldn&apos;t load voice channels.{' '}
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={() => void voiceChannelsQuery.refetch()}
                    >
                      Try again
                    </button>
                  </div>
                ) : voiceChannels.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {voiceChannels.map((c) => (
                      <li key={c.id}>
                        <VoiceChannelRow
                          channel={c}
                          href={`/projects/${projectSlug}/voice/${c.id}`}
                          canManage={canManage}
                          projectSlugOrId={projectSlug}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 px-2 py-1.5 text-[11px] text-ink-3">
                    {canManage ? 'No voice channels yet. Click + to add one.' : 'No voice channels yet.'}
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </nav>
    </>
  );
}

function ChannelRow({
  channel,
  href,
  active,
  unread,
}: {
  channel: ChatChannel;
  href: string;
  active: boolean;
  /** Unread message count for this specific channel (0 hides the badge). */
  unread: number;
}) {
  return (
    <li>
      <Link
        href={href as never}
        className={cn(
          'flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition-colors',
          active ? 'bg-surface text-ink shadow-1' : 'text-ink-2 hover:bg-surface/70 hover:text-ink',
          channel.isArchived && 'opacity-60',
        )}
      >
        {channel.isArchived ? (
          <Lock className="h-3.5 w-3.5 text-ink-3" strokeWidth={2.25} />
        ) : (
          <Hash className="h-3.5 w-3.5 text-ink-3" strokeWidth={2.25} />
        )}
        <span className={cn('min-w-0 flex-1 truncate', unread > 0 && !active && 'font-semibold text-ink')}>
          {channel.name}
        </span>
        {unread > 0 ? (
          <span className="inline-grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-brand-blue-strong px-1 text-[10px] font-medium leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function CreateChannelButton({ scope }: { scope: ChatScope }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [topic, setTopic] = React.useState('');

  const createMutation = useMutation({
    mutationFn: (body: { name: string; topic?: string }) =>
      api<ChatChannel>(
        scope.kind === 'project'
          ? apiPaths.chat.channels(scope.slug)
          : apiPaths.chat.globalChannels(),
        { method: 'POST', body },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey:
          scope.kind === 'project'
            ? queryKeys.chat.channels(scope.slug)
            : queryKeys.chat.globalChannels,
      });
      setOpen(false);
      setName('');
      setTopic('');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={scope.kind === 'project' ? 'New channel' : 'New workspace channel'}
          className="inline-grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface hover:text-ink md:h-6 md:w-6"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogTitle className="font-display text-h3 text-ink">
          {scope.kind === 'project' ? 'New channel' : 'New workspace channel'}
        </DialogTitle>
        <p className="mt-1 text-[13px] text-ink-3">
          {scope.kind === 'project'
            ? 'Letters, numbers, hyphens and underscores. Lowercase recommended.'
            : 'Visible to everyone in the workspace. Letters, numbers, hyphens and underscores.'}
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim().toLowerCase();
            if (!trimmed) return;
            createMutation.mutate({ name: trimmed, topic: topic.trim() || undefined });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="design-review"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="channel-topic">Topic (optional)</Label>
            <Input
              id="channel-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What this channel is for"
            />
          </div>
          {createMutation.isError ? (
            <div className="text-[13px] text-brand-red">
              {(createMutation.error as { body?: { message?: string } })?.body?.message ??
                'Failed to create channel.'}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServerAvatarTile({
  emoji,
  color,
  imageUrl,
}: {
  emoji: string;
  color: string;
  imageUrl: string | null;
}) {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md text-[15px] leading-none"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        emoji
      )}
    </span>
  );
}

/** Project server tile in the channel sidebar, keyed by the slug. */
function ProjectAvatarTile({ projectSlug }: { projectSlug: string }) {
  const { projects } = useChatOverview();
  const project = projects.find((p) => p.slug === projectSlug);
  // Seed on the slug (known immediately from the route, unlike the
  // project id which only exists once the overview query resolves) so
  // this always renders the same derived default as the rail's tile,
  // instead of flipping emoji/color the moment the overview loads.
  const avatar = chatAvatarFor(projectSlug, project?.avatar);
  return (
    <ServerAvatarTile emoji={avatar.emoji} color={avatar.color} imageUrl={avatar.imageUrl} />
  );
}

// NOTE: revisit auth session expiry handling after the next load test
