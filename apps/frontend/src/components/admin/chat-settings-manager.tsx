'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, RotateCcw, Save } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { chatAvatarFor } from '@/lib/chat/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import type { ChatAvatarInfo } from '@/lib/types';

interface AdminAvatarList {
  workspace: ChatAvatarInfo | null;
  projects: Array<{ id: string; slug: string; title: string; avatar: ChatAvatarInfo | null }>;
}

export function ChatSettingsManager() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['admin', 'chat', 'avatars'],
    queryFn: () => api<AdminAvatarList>(apiPaths.adminChat.avatars()),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'chat', 'avatars'] });
    void qc.invalidateQueries({ queryKey: ['chat', 'me', 'projects'] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-h2 tracking-[-0.01em] text-ink">Chat settings</h2>
        <p className="mt-1 text-body-sm text-ink-2">
          Server avatars for the chat rail. By default every server gets a random emoji on a
          random background; pick a different emoji and color, or set a picture URL to replace it.
        </p>
      </div>

      {list.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : list.isError || !list.data ? (
        <p className="text-[13px] text-brand-red">Could not load chat settings.</p>
      ) : (
        <div className="space-y-4">
          <AvatarRow
            title="Workspace"
            subtitle="Shown as the top tile in every chat rail."
            seed="workspace"
            avatar={list.data.workspace}
            onSaved={invalidate}
          />
          {list.data.projects.map((p) => (
            <AvatarRow
              key={p.id}
              title={p.title}
              subtitle={`Project server · ${p.slug}`}
              seed={p.id}
              avatar={p.avatar}
              onSaved={invalidate}
            />
          ))}
          {list.data.projects.length === 0 ? (
            <p className="text-[13px] text-ink-3">No projects yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AvatarRow({
  title,
  subtitle,
  seed,
  avatar,
  onSaved,
}: {
  title: string;
  subtitle: string;
  seed: string;
  avatar: ChatAvatarInfo | null;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const derived = chatAvatarFor(seed, null);

  const [emoji, setEmoji] = React.useState('');
  const [color, setColor] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [hydratedFor, setHydratedFor] = React.useState<ChatAvatarInfo | null | undefined>(
    undefined,
  );

  // Seed the form once per fetched avatar.
  React.useEffect(() => {
    if (hydratedFor === avatar) return;
    setEmoji(avatar?.emoji ?? '');
    setColor(avatar?.color ?? '');
    setImageUrl(avatar?.imageUrl ?? '');
    setHydratedFor(avatar);
  }, [avatar, hydratedFor]);

  const preview = chatAvatarFor(seed, {
    emoji: emoji || null,
    color: color || null,
    imageUrl: imageUrl || null,
  });

  const dirty =
    emoji !== (avatar?.emoji ?? '') ||
    color !== (avatar?.color ?? '') ||
    imageUrl !== (avatar?.imageUrl ?? '');

  const save = useMutation({
    mutationFn: () =>
      api(apiPaths.adminChat.avatar(seed), {
        method: 'PUT',
        body: {
          emoji: emoji.trim() || null,
          color: color || null,
          imageUrl: imageUrl.trim() || null,
        },
      }),
    onSuccess: () => {
      onSaved();
      show({ tone: 'success', title: `Avatar updated for ${title}` });
    },
    onError: (err) =>
      show({
        tone: 'danger',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
      }),
  });

  const reset = useMutation({
    mutationFn: () => api(apiPaths.adminChat.avatar(seed), { method: 'DELETE' }),
    onSuccess: () => {
      onSaved();
      show({ tone: 'success', title: `Avatar reset for ${title}` });
    },
    onError: (err) =>
      show({
        tone: 'danger',
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
      }),
  });

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-4">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg text-[22px] leading-none"
          style={{ backgroundColor: preview.color }}
          aria-hidden
        >
          {preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            preview.emoji
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">{title}</div>
          <div className="truncate text-[12px] text-ink-3">
            {subtitle}
            {!avatar ? ` · default (${derived.emoji})` : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[140px_150px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`av-emoji-${seed}`}>Emoji</Label>
          <Input
            id={`av-emoji-${seed}`}
            value={emoji}
            maxLength={8}
            placeholder={derived.emoji}
            onChange={(e) => setEmoji(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`av-color-${seed}`}>Background</Label>
          <div className="flex items-center gap-2">
            <input
              id={`av-color-${seed}`}
              type="color"
              value={color || '#5865F2'}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-11 cursor-pointer rounded border border-line bg-surface p-1"
            />
            <span className="text-[11px] text-ink-3">{color || 'default'}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`av-img-${seed}`}>Picture URL (optional)</Label>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2.25} />
            <Input
              id={`av-img-${seed}`}
              value={imageUrl}
              placeholder="https://…"
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        {avatar ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reset.mutate()}
            loading={reset.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
            Reset to default
          </Button>
        ) : null}
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
          <Save className="h-3.5 w-3.5" strokeWidth={2.25} />
          Save
        </Button>
      </div>
    </div>
  );
}

// The emoji length bound mirrors the backend validation
