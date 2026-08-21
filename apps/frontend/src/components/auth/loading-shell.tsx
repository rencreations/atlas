'use client';

import { LoaderCircle } from 'lucide-react';

/** Full-viewport centered spinner. Used as a Suspense fallback for the
 *  useSearchParams-driven auth pages, the authenticated-layout gate, and
 *  the first-run gate — so navigation never flashes a blank screen. */
export function LoadingShell() {
  return (
    <div className="grid min-h-svh place-items-center bg-surface">
      <LoaderCircle className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
    </div>
  );
}
