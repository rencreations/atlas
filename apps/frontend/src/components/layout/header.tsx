'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';
import { ShapeSignature } from '@/components/brand/shape-signature';
import { MenuIcon } from '@/components/icons/animated/menu';
import { PlusIcon } from '@/components/icons/animated/plus';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatNavButton } from '@/components/chat/chat-nav-button';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/types';

interface NavLink {
  label: string;
  href: string;
}

const NAV: NavLink[] = [
  { label: 'For me', href: '/for-me' },
  { label: 'Discover', href: '/dashboard' },
  { label: 'Browse', href: '/projects' },
  { label: 'My work', href: '/me' },
];

export function Header({ user }: { user?: SessionUser | null }) {
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[backdrop-filter,background-color,border-color] duration-200 ease-out-soft',
        scrolled
          ? 'border-b border-line bg-surface/80 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="container-x mx-auto flex h-14 max-w-[1360px] items-center gap-6 md:h-16">
        <Link href={'/dashboard' as never} aria-label="Atlas home" className="flex items-center gap-2">
          <motion.span
            className="flex items-center"
            whileHover={reducedMotion ? undefined : { scale: 1.08, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <ShapeSignature size={24} />
          </motion.span>
          <Wordmark withSignature={false} className="hidden text-[18px] sm:inline-flex" />
        </Link>

        <nav className="hidden flex-1 items-center gap-6 md:flex">
          {NAV.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href as never}
                className={cn(
                  'relative pb-1 text-[14px] font-medium transition-colors',
                  active ? 'text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                {link.label}
                {active ? (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-brand-blue-strong" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Mobile navigation, replaces the hidden md:flex nav below md. */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <MenuIcon size={20} className="flex items-center justify-center" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              {NAV.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link
                      href={link.href as never}
                      className={cn(active ? 'text-brand-blue' : 'text-ink')}
                    >
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={'/projects/new' as never}>
                  <PlusIcon size={16} className="flex items-center justify-center" />
                  New project
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Labelled controls need lg+; below that they collapse to icons
              so the header never overflows (the hamburger menu already
              carries New project on mobile). */}
          <Button asChild size="sm" className="hidden lg:inline-flex">
            <Link href={'/projects/new' as never}>
              <PlusIcon size={16} className="flex items-center justify-center" />
              New project
            </Link>
          </Button>
          <Button asChild size="icon-sm" variant="ghost" className="lg:hidden">
            <Link href={'/projects/new' as never} aria-label="New project">
              <PlusIcon size={16} className="flex items-center justify-center" />
            </Link>
          </Button>
          {user ? <ChatNavButton /> : null}
          {user ? <NotificationBell /> : null}
          {user ? <UserMenu isAdmin={user.isAdmin} /> : null}
        </div>
      </div>
    </header>
  );
}

// TODO(ops): confirm notification preference defaults behavior on the next staging deploy
