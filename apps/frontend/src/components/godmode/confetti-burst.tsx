'use client';

import * as React from 'react';
import lottie from 'lottie-web';
import { cn } from '@/lib/utils';

/**
 * Plays the confetti burst from /confetti.lottie once and destroys the
 * animation. `oncePerSessionKey` makes it fire only the first time per
 * browser session (e.g. one burst when the admin first sees the live
 * overview), not on every navigation.
 */
export function ConfettiBurst({
  className,
  oncePerSessionKey,
}: {
  className?: string;
  oncePerSessionKey?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (oncePerSessionKey) {
      if (sessionStorage.getItem(oncePerSessionKey)) return;
      sessionStorage.setItem(oncePerSessionKey, 'played');
    }
    const container = ref.current;
    if (!container) return;
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: '/confetti.lottie',
    });
    return () => anim.destroy();
  }, [oncePerSessionKey]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none overflow-hidden', className)}
    />
  );
}
