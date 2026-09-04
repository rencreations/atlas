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
import { GlobalSearch } from '@/components/search/global-search';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';
import { useChatOverview } from '@/lib/chat/use-chat-overview';
import { useCanCreateProject } from '@/lib/hooks/use-can-create-project';
import { SearchIcon } from '@/components/icons/animated/search';
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
  const { totalUnread: chatUnread } = useChatOverview({ enabled: Boolean(user) });
  const { canCreate: canCreateProject } = useCanCreateProject(user);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ⌘K / Ctrl+K opens global search from anywhere in the app.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
          {user ? <ChatNavButton /> : null}
          {user ? (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Search"
              className="px-2 xl:px-3"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon size={16} className="flex items-center justify-center" />
              <span className="hidden xl:inline">Search</span>
            </Button>
          ) : null}
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
              {user ? (
                <DropdownMenuItem asChild>
                  <Link href={'/chat' as never} className="flex items-center justify-between gap-2">
                    <span>Chat</span>
                    {chatUnread > 0 ? (
                      <span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-brand-blue-strong px-1 text-[10px] font-medium leading-none text-white">
                        {chatUnread > 99 ? '99+' : chatUnread}
                      </span>
                    ) : null}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {user ? (
                <DropdownMenuItem onSelect={() => setSearchOpen(true)}>Search</DropdownMenuItem>
              ) : null}
              {canCreateProject ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={'/projects/new' as never}>
                      <PlusIcon size={16} className="flex items-center justify-center" />
                      New project
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Labelled controls need lg+; below that they collapse to icons
              so the header never overflows (the hamburger menu already
              carries New project on mobile). Hidden outright for members
              without projects.create, rather than showing a CTA that 403s. */}
          {canCreateProject ? (
            <>
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
            </>
          ) : null}
          {user ? <NotificationBell /> : null}
          {user ? <UserMenu isAdmin={user.isAdmin} /> : null}
        </div>
      </div>
      {user ? <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} /> : null}
    </header>
  );
}

// TODO(ops): confirm notification preference defaults behavior on the next staging deploy
