'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const LETTERS = ['A', 'T', 'L', 'A', 'S'];

interface FooterLinkItem {
  label: string;
  href: string;
  external?: boolean;
}

const LINKS: FooterLinkItem[] = [
  { label: 'GitHub', href: 'https://github.com/shirasakaren/atlas', external: true },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Status', href: '/health' },
];

/**
 * The Atlas footer — one oversized wordmark in the theme's primary color
 * whose letters emerge one by one when the footer scrolls into view,
 * followed by the essential links only. No columns, no rainbow strip.
 */
export function Footer() {
  const rootRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <footer ref={rootRef} className="mt-24 overflow-hidden border-t border-line bg-surface">
      <div className="container-x flex flex-col items-center gap-8 py-16 text-center md:py-20">
        <p className="select-none font-display text-[clamp(3.5rem,13vw,9.5rem)] font-semibold leading-none tracking-[-0.04em]">
          {LETTERS.map((letter, i) => (
            <span
              key={i}
              aria-hidden
              className={cn('inline-block text-brand-blue', visible ? 'animate-fade-up' : 'opacity-0')}
              style={{ animationDelay: `${140 + i * 90}ms` }}
            >
              {letter}
            </span>
          ))}
        </p>
        <span className="sr-only">Atlas</span>

        <nav
          aria-label="Footer"
          className={cn(
            'flex flex-wrap items-center justify-center gap-x-8 gap-y-3',
            visible ? 'animate-fade-up' : 'opacity-0',
          )}
          style={{ animationDelay: '700ms' }}
        >
          {LINKS.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-[13.5px] font-medium text-ink-3 transition-colors duration-120 hover:text-brand-blue"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href as never}
                className="text-[13.5px] font-medium text-ink-3 transition-colors duration-120 hover:text-brand-blue"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <p
          className={cn(
            'text-[12.5px] text-ink-4',
            visible ? 'animate-fade-up' : 'opacity-0',
          )}
          style={{ animationDelay: '820ms' }}
        >
          © {new Date().getFullYear()} Shirasaka Ren · Licensed under AGPL-3.0
        </p>
      </div>
    </footer>
  );
}
