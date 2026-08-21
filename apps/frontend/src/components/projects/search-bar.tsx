'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlobalSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [value, setValue] = React.useState(q);

  // Keep the input in sync with ?q= (back/forward, cleared filters,
  // dashboard "View all" navigation that drops the param).
  React.useEffect(() => {
    setValue(q);
  }, [q]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim();
    if (!query) return;
    router.push(`/projects?q=${encodeURIComponent(query)}` as never);
  }

  return (
    <form onSubmit={onSubmit} className={cn('relative', className)} role="search">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        strokeWidth={2.25}
      />
      <input
        type="search"
        placeholder="Search projects, tags, technologies…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          'h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-4',
          'transition-[border-color,box-shadow] duration-120 ease-out-soft',
          'hover:border-line-strong',
          'focus:border-brand-blue focus:outline-none focus:shadow-[0_0_0_3px_rgba(58,109,197,0.15)]',
        )}
      />
    </form>
  );
}
