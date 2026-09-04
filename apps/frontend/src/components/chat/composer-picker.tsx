'use client';

import * as React from 'react';
import { Loader2, ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ChatGif, PublicConfig, Sticker, StickerPack } from '@/lib/types';
import { useTheme } from '@/lib/theme';
import { SmileIcon } from '@/components/icons/animated/smile';

// Lazy-load the emoji and GIF pickers, they're heavy and only needed
// when the popover opens. Loading on the main bundle would punish every
// chat view, not just users that open the picker.
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));
const KlipyGifPicker = React.lazy(() => import('./klipy-gif-picker'));

// Type-only so the heavy picker bundle stays out of the main chunk; the
// Theme enum's values are string literals ('dark' | 'light').
import type { Theme } from 'emoji-picker-react';

interface Props {
  /** Called with the emoji character (e.g. "👍") to insert at the caret. */
  onEmojiPick: (emoji: string) => void;
  /** Called with the GIF URL to insert into the message body. */
  onGifPick: (gif: ChatGif) => void;
  /** Called when the user picks a sticker, attaches it as an inline image. */
  onStickerPick: (sticker: Sticker) => void;
  /** Called whenever the popover closes (either by selection or outside
   *  click). The composer wires this to refocus the textarea so a
   *  subsequent Enter sends the message instead of reopening this picker
   *  (Radix's default close-auto-focus returns focus to the trigger). */
  onAfterClose?: () => void;
}

/**
 * Three-tab picker (Emoji / GIF / Sticker) anchored on the composer's
 * smile button. Mirrors the WhatsApp pattern. Sticker tab is a stub
 * for P3, stickers ship in P5 (admin upload UI + sticker API). When
 * the GIF tab is disabled (TENOR_API_KEY unset on the server), the
 * tab still renders but says so plainly.
 */
export function ComposerPicker({ onEmojiPick, onGifPick, onStickerPick, onAfterClose }: Props) {
  const [open, setOpen] = React.useState(false);
  // emoji-picker-react defaults to light; follow the app theme instead.
  const { resolved } = useTheme();
  const pickerTheme = (resolved === 'dark' ? 'dark' : 'light') as Theme;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onAfterClose?.();
      }}
    >
      <PopoverTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Emoji, GIF, sticker" className="shrink-0">
          <SmileIcon size={16} className="flex items-center justify-center" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        // Anchor on the bottom-left of the smile button: popover sits
        // above the trigger (composer is at the bottom of the screen, so
        // "below" would clip) and extends RIGHTWARD across the composer
        // instead of jutting off the left edge.
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions
        // Skip Radix's "return focus to the trigger button" behaviour —
        // otherwise pressing Enter immediately after closing the picker
        // reopens it instead of sending the typed message. The composer
        // takes care of focusing the textarea via `onAfterClose`.
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <Tabs defaultValue="emoji" className="flex flex-col">
          {/* Add breathing room around the tab strip so the labels aren't
              flush against the popover's left edge. */}
          <TabsList className="gap-4 border-b border-line px-3 pt-2">
            <TabsTrigger value="emoji">Emoji</TabsTrigger>
            <TabsTrigger value="gif">GIF</TabsTrigger>
            <TabsTrigger value="sticker">Sticker</TabsTrigger>
          </TabsList>
          <TabsContent value="emoji" className="mt-0 p-0">
            <React.Suspense
              fallback={
                <div className="grid h-[360px] place-items-center text-ink-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              }
            >
              <EmojiPicker
                onEmojiClick={(e) => {
                  onEmojiPick(e.emoji);
                  setOpen(false);
                }}
                theme={pickerTheme}
                width="100%"
                height={360}
                lazyLoadEmojis
              />
            </React.Suspense>
          </TabsContent>
          <TabsContent value="gif" className="mt-0 p-2">
            <GifTab
              onPick={(g) => {
                onGifPick(g);
                setOpen(false);
              }}
            />
          </TabsContent>
          <TabsContent value="sticker" className="mt-0 p-2">
            <StickerTab
              onPick={(s) => {
                onStickerPick(s);
                setOpen(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function GifTab({ onPick }: { onPick: (gif: ChatGif) => void }) {
  const configQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: () => api<PublicConfig>(apiPaths.publicConfig()),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  if (configQuery.isLoading) {
    return (
      <div className="grid h-[360px] place-items-center text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const gifs = configQuery.data?.gifs;
  if (!gifs?.available || !gifs.klipyAppKey) {
    return (
      <div className="grid h-[320px] place-items-center px-4 text-center text-[13px] text-ink-3">
        GIF search isn’t configured on this server.
      </div>
    );
  }

  return (
    <div className="h-[360px]">
      <React.Suspense
        fallback={
          <div className="grid h-[360px] place-items-center text-ink-3">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        }
      >
        <KlipyGifPicker appKey={gifs.klipyAppKey} onPick={onPick} />
      </React.Suspense>
    </div>
  );
}

function StickerTab({ onPick }: { onPick: (sticker: Sticker) => void }) {
  const packsQuery = useQuery({
    queryKey: ['chat', 'stickers', 'packs'],
    queryFn: () => api<StickerPack[]>(apiPaths.chat.stickerPacks()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const packs = packsQuery.data ?? [];
  const totalStickers = packs.reduce((s, p) => s + p.stickers.length, 0);

  if (packsQuery.isLoading) {
    return (
      <div className="grid h-[320px] place-items-center text-ink-3">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (totalStickers === 0) {
    return (
      <div className="grid h-[320px] place-items-center px-4 text-center text-[13px] text-ink-3">
        <div className="space-y-1">
          <ImageIcon className="mx-auto h-6 w-6 text-ink-4" strokeWidth={2.25} />
          <div>No stickers yet.</div>
          <div className="text-[11px]">Admins can upload packs from the admin panel.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[360px] space-y-3 overflow-y-auto pr-1">
      {packs
        .filter((p) => p.stickers.length > 0)
        .map((pack) => (
          <div key={pack.id}>
            <div className="mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
              {pack.name}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {pack.stickers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s)}
                  title={s.name}
                  className="aspect-square overflow-hidden rounded border border-line hover:border-brand-blue/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.url}
                    alt={s.name}
                    loading="lazy"
                    className="block h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// The ordering here matters for project slug migration safety
