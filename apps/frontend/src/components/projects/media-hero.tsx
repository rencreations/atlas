'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ImagePlus, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectMedia } from '@/lib/types';

export function MediaHero({
  media,
  title,
  manageHref,
}: {
  media: ProjectMedia[];
  title: string;
  /** When the viewer can edit the project, the empty state offers a way in.
   *  Everyone else gets nothing rather than a placeholder. */
  manageHref?: string;
}) {
  const items = media.length > 0 ? media : null;
  const [idx, setIdx] = React.useState(0);

  if (!items) {
    // A full 16/9 grey box used to sit here, pushing the project's actual
    // content below the fold to say nothing.
    if (!manageHref) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-line-strong bg-surface-muted/40 px-5 py-4">
        <div className="flex items-start gap-3">
          <ImagePlus className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" strokeWidth={2.25} />
          <div>
            <p className="text-[14px] font-medium text-ink">Add screenshots or a demo video</p>
            <p className="mt-0.5 text-[13px] text-ink-3">
              Projects with media stand out in the discover feed.
            </p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={manageHref as never}>Add media</Link>
        </Button>
      </div>
    );
  }
  const active = items[idx];
  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-surface-muted">
        {active.type === 'VIDEO' ? (
          <video
            key={active.id}
            src={active.url}
            controls
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            key={active.id}
            src={active.url}
            alt={`${title} — image ${idx + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 1100px"
            className="object-cover"
            priority={idx === 0}
          />
        )}

        {items.length > 1 ? (
          <>
            <button
              onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
              className="absolute left-3 top-1/2 inline-grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-2 hover:bg-surface"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % items.length)}
              className="absolute right-3 top-1/2 inline-grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-2 hover:bg-surface"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
      </div>

      {items.length > 1 ? (
        <div className="scroll-hidden flex gap-2 overflow-x-auto">
          {items.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setIdx(i)}
              aria-label={`View item ${i + 1}`}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded transition-all',
                i === idx
                  ? 'ring-2 ring-brand-blue ring-offset-2'
                  : 'opacity-70 hover:opacity-100',
              )}
            >
              {m.type === 'IMAGE' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-surface-inverse text-white">
                  <Play className="h-4 w-4 fill-current" />
                </div>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// NOTE: revisit typing indicator backpressure after the next load test

// TODO(ops): confirm whiteboard scene compression behavior on the next staging deploy
