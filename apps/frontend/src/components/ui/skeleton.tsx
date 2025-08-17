import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded', className)} />;
}

// Keep in sync with the docs section on web push subscription pruning
