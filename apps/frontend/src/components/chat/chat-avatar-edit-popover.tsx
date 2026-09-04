'use client';

import * as React from 'react';
import { Image as ImageIcon, Pencil, RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { chatAvatarFor } from '@/lib/chat/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/toast';
import type { ChatAvatarInfo } from '@/lib/types';

interface Props {
  /** Backend ChatAvatar row key ('workspace' or 'project:<id>'). */
  avatarKey: string;
  /** Used only to derive the preview default, matches the tile's own seed. */
  seed: string;
  title: string;
  avatar: ChatAvatarInfo | null | undefined;
}

/**
 * Admin-only edit affordance on a chat rail tile: a small pencil badge
 * that opens a compact popover to set the server's emoji/color/picture
 * without leaving the chat window. Mirrors the admin panel's Chat
 * settings editor, scoped to one server.
 */
export function ChatAvatarEditPopover({ avatarKey, seed, title, avatar }: Props) {
  const [open, setOpen] = React.useState(false);
  const { show } = useToast();
  const qc = useQueryClient();

  const [emoji, setEmoji] = React.useState(avatar?.emoji ?? '');
  const [color, setColor] = React.useState(avatar?.color ?? '');
  const [imageUrl, setImageUrl] = React.useState(avatar?.imageUrl ?? '');

  // Re-seed the form whenever the popover opens (picks up the latest
  // fetched avatar, in case it changed elsewhere since last open).
  React.useEffect(() => {
    if (!open) return;
    setEmoji(avatar?.emoji ?? '');
    setColor(avatar?.color ?? '');
    setImageUrl(avatar?.imageUrl ?? '');
  }, [open, avatar]);

  const preview = chatAvatarFor(seed, {
    emoji: emoji || null,
    color: color || null,
    imageUrl: imageUrl || null,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.chat.myProjects });
    void qc.invalidateQueries({ queryKey: ['admin', 'chat', 'avatars'] });
  };

  const save = useMutation({
    mutationFn: () =>
      api(apiPaths.adminChat.avatar(avatarKey), {
        method: 'PUT',
        body: {
          emoji: emoji.trim() || null,
          color: color || null,
          imageUrl: imageUrl.trim() || null,
        },
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
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
    mutationFn: () => api(apiPaths.adminChat.avatar(avatarKey), { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Edit ${title} avatar`}
          title={`Edit ${title} avatar`}
          // Sibling of the tile's Link, not nested inside it, so this
          // never triggers navigation; stopPropagation is still cheap
          // insurance against a future markup change.
          onClick={(e) => e.stopPropagation()}
          className="absolute -right-1 -top-1 z-10 inline-grid h-5 w-5 place-items-center rounded-full border border-line bg-surface text-ink-3 opacity-0 shadow-1 transition-opacity duration-120 ease-out-soft group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
        >
          <Pencil className="h-2.5 w-2.5" strokeWidth={2.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 p-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg text-[20px] leading-none"
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
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">{title}</div>
            <div className="text-[11px] text-ink-3">Server avatar</div>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1">
              <Label htmlFor={`rail-av-emoji-${avatarKey}`}>Emoji</Label>
              <Input
                id={`rail-av-emoji-${avatarKey}`}
                value={emoji}
                maxLength={8}
                onChange={(e) => setEmoji(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`rail-av-color-${avatarKey}`}>Color</Label>
              <input
                id={`rail-av-color-${avatarKey}`}
                type="color"
                value={color || '#5865F2'}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-11 cursor-pointer rounded border border-line bg-surface p-1"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`rail-av-img-${avatarKey}`}>Picture URL (optional)</Label>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2.25} />
              <Input
                id={`rail-av-img-${avatarKey}`}
                value={imageUrl}
                placeholder="https://…"
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          {avatar ? (
            <Button variant="ghost" size="sm" onClick={() => reset.mutate()} loading={reset.isPending}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
              Reset
            </Button>
          ) : null}
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
