'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, Monitor, ShieldCheck, SlidersHorizontal, User as UserIcon } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserIcon, href: '/settings/profile' },
  { id: 'appearance', label: 'Appearance', icon: Monitor, href: '/settings/appearance' },
  { id: 'account', label: 'Account', icon: SlidersHorizontal, href: '/settings/account' },
  { id: 'notifications', label: 'Notifications', icon: ShieldCheck, href: '/settings/notifications' },
  { id: 'privacy', label: 'Privacy & consent', icon: Lock, href: '/settings/privacy' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Container className="py-10">
      <div className="mb-8">
        <span className="text-eyebrow uppercase text-brand-blue">Settings</span>
        <h1 className="mt-2 font-display text-display-lg tracking-[-0.02em] text-ink">
          Your settings
        </h1>
        <p className="mt-1 text-body-sm text-ink-2">
          Profile, appearance, account security, notifications, and consent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
            return (
              <Link
                key={s.id}
                href={s.href as never}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded px-3 py-2 text-[13.5px] font-medium transition-colors duration-120',
                  active
                    ? 'bg-brand-blue-50 text-brand-blue'
                    : 'text-ink-2 hover:bg-surface-muted hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
