'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/** Horizontal scroll row with arrow controls and snap points (Netflix-style). */
export function ScrollRow({ children, className, ariaLabel }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const scrollBy = (delta: number) => {
    ref.current?.scrollBy({ left: delta, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className={cn('group/row relative', className)}>
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        className="scroll-hidden flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-600)}
        aria-label="Scroll left"
        className={cn(
          'absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-3 -translate-y-1/2',
          'place-items-center rounded-full bg-surface text-ink shadow-2 transition-opacity duration-200',
          'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 hover:opacity-100 focus-visible:opacity-100',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'md:grid',
        )}
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(600)}
        aria-label="Scroll right"
        className={cn(
          'absolute right-0 top-1/2 z-10 hidden h-10 w-10 translate-x-3 -translate-y-1/2',
          'place-items-center rounded-full bg-surface text-ink shadow-2 transition-opacity duration-200',
          'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 hover:opacity-100 focus-visible:opacity-100',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'md:grid',
        )}
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

// Fallback path for feature flag rollout checklist when the primary is unavailable

// TODO(ops): confirm session idle timeout policy behavior on the next staging deploy

// Bounded on purpose: OIDC redirect validation must not grow unbounded
