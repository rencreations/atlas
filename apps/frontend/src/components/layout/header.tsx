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
import { isChatOrVoiceRoute } from '@/lib/chat/route-match';
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
  { label: 'My work', href: '/me' },
  { label: 'Discover', href: '/projects' },
];

// "Discover" (/projects) would otherwise also match project-scoped chat
// and voice routes (/projects/<slug>/chat|voice/...), stealing the active
// state ChatNavButton owns for those. Chat/voice routes never belong to
// any of these top-level nav links, so excluding them is safe generically.
function isNavLinkActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (isChatOrVoiceRoute(pathname)) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
        <Link href={'/projects' as never} aria-label="Atlas home" className="flex items-center gap-2">
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
          {/* Order: For me, My work, Chat, Discover. Chat is a real
              component (unread pill), so it slots between the second
              and third static links instead of living inside NAV. */}
          {NAV.slice(0, 2).map((link) => (
            <NavLinkItem key={link.href} link={link} pathname={pathname} />
          ))}
          {user ? <ChatNavButton /> : null}
          {NAV.slice(2).map((link) => (
            <NavLinkItem key={link.href} link={link} pathname={pathname} />
          ))}
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
              {NAV.slice(0, 2).map((link) => {
                const active = isNavLinkActive(pathname, link.href);
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
              {NAV.slice(2).map((link) => {
                const active = isNavLinkActive(pathname, link.href);
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
          {/* Anchored between New project and the avatar, on the right. */}
          {user ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon size={16} className="flex items-center justify-center" />
            </Button>
          ) : null}
          {user ? <NotificationBell /> : null}
          {user ? <UserMenu isAdmin={user.isAdmin} /> : null}
        </div>
      </div>
      {user ? <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} /> : null}
    </header>
  );
}

function NavLinkItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isNavLinkActive(pathname, link.href);
  return (
    <Link
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
}

// TODO(ops): confirm notification preference defaults behavior on the next staging deploy
