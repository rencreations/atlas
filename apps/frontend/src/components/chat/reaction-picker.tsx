'use client';

import * as React from 'react';
import { SmilePlus, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Lazy-load, same picker the composer uses, ~600KB. Don't punish every
// hover with that bundle.
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));

// Type-only so the heavy picker bundle stays out of the main chunk.
import type { Theme } from 'emoji-picker-react';
import { useTheme } from '@/lib/theme';

// A small row of recent reactions stays at the top so the common case
// (👍 a message) still takes a single click.
const QUICK_REACTIONS = ['👍', '❤️', '🎉', '🚀', '😂', '👀'];

interface Props {
  onPick: (emoji: string) => void;
  /** Reported to the parent so it can keep the hover-bar pinned open while
   *  the popover is mounted, otherwise the trigger loses its bounding box
   *  the moment the cursor leaves the message row and Radix re-anchors the
   *  popover, causing the flicker / jump the user reported. */
  onOpenChange?: (open: boolean) => void;
  /** Optional className applied to the trigger button. */
  triggerClassName?: string;
}

/**
 * Hover-bar reaction picker. Click the smile icon to open a popover
 * with a quick-row of common reactions + a full searchable emoji
 * grid. Anchors above the message row by default so it doesn't fall
 * off the bottom of the viewport.
 */
export function ReactionPicker({ onPick, onOpenChange, triggerClassName }: Props) {
  const [open, setOpen] = React.useState(false);
  // Follow the app theme, emoji-picker-react defaults to light.
  const { resolved } = useTheme();
  const pickerTheme = (resolved === 'dark' ? 'dark' : 'light') as Theme;
  const setBoth = React.useCallback(
    (o: boolean) => {
      setOpen(o);
      onOpenChange?.(o);
    },
    [onOpenChange],
  );

  return (
    <Popover open={open} onOpenChange={setBoth}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Add reaction"
          aria-label="Add reaction"
          className={cn(
            'inline-grid h-7 w-7 place-items-center rounded text-ink-2 hover:bg-surface-muted hover:text-ink',
            triggerClassName,
          )}
        >
          <SmilePlus className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions
        className="w-[340px] max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex gap-1 border-b border-line p-1.5">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setBoth(false);
              }}
              className="rounded p-1 text-[18px] hover:bg-surface-muted"
            >
              {e}
            </button>
          ))}
        </div>
        <React.Suspense
          fallback={
            <div className="grid h-[320px] place-items-center text-ink-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          }
        >
          <EmojiPicker
            onEmojiClick={(e) => {
              onPick(e.emoji);
              setBoth(false);
            }}
            theme={pickerTheme}
            width="100%"
            height={320}
            lazyLoadEmojis
            searchPlaceHolder="Search emoji"
          />
        </React.Suspense>
      </PopoverContent>
    </Popover>
  );
}
