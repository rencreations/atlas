'use client';

import * as React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Render as a page-level h1 (error replaces the whole page) instead of
   *  an in-content h3. */
  page?: boolean;
  className?: string;
}

/** Shared fetch-error state. Use this wherever a query failure would
 *  otherwise render a spinner forever or masquerade as an empty state. */
export function ErrorState({
  title = "Couldn't load this",
  message = 'Something went wrong while fetching. Check your connection and try again.',
  onRetry,
  page,
  className,
}: Props) {
  const heading = page ? (
    <h1 className="font-display text-h2 tracking-[-0.01em] text-ink">{title}</h1>
  ) : (
    <h3 className="font-display text-h3 text-ink">{title}</h3>
  );
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-line bg-surface p-8 text-center sm:p-10',
        className,
      )}
    >
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-brand-red">
        <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />
      </div>
      {heading}
      {message ? <p className="mx-auto mt-2 max-w-prose text-body-sm text-ink-2">{message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCw className="h-4 w-4" strokeWidth={2.25} />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
