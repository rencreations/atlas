'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AtSign,
  BadgeCheck,
  Fingerprint,
  Globe,
  KeyRound,
  LayoutGrid,
  Link2,
  LoaderCircle,
  LogOut,
  Mail,
  MessageSquareText,
  Plug,
  Rocket,
  ScrollText,
  Settings2,
  ShieldCheck,
  Timer,
  UserPlus,
  Users,
} from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  clearGodmodeToken,
  GodmodeError,
  godmodeFetch,
  godmodePaths,
} from '@/lib/godmode/client';
import type { GodmodeSettingsView } from '@/lib/godmode/types';
import { SettingsEditor } from './settings-editor';
import { UsersPanel } from './users-panel';
import { RolesPanel } from './roles-panel';
import { SecurityPanel } from './security-panel';

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  groups?: string[]; // settings groups rendered by this section
}

const SECTIONS: Section[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'site', label: 'Site', icon: Globe, groups: ['site', 'legal'] },
  { id: 'registration', label: 'Registration', icon: UserPlus, groups: ['registration'] },
  { id: 'auth', label: 'Sign-in methods', icon: KeyRound, groups: ['auth'] },
  { id: 'sessions', label: 'Sessions', icon: Timer, groups: ['sessions'] },
  { id: 'email', label: 'Email', icon: Mail, groups: ['email'] },
  { id: 'sms', label: 'SMS / OTP', icon: MessageSquareText, groups: ['sms'] },
  { id: 'oauth', label: 'OAuth providers', icon: Plug, groups: ['oauth'] },
  { id: 'sso', label: 'SSO (OIDC / SAML)', icon: Link2, groups: ['sso'] },
  { id: 'storage', label: 'Storage', icon: AtSign, groups: ['storage'] },
  { id: 'integrations', label: 'Integrations', icon: Plug, groups: ['integrations'] },
  { id: 'modules', label: 'Modules', icon: Rocket, groups: ['modules'] },
  { id: 'users', label: 'Users & invites', icon: Users },
  { id: 'roles', label: 'Roles & permissions', icon: ShieldCheck },
  { id: 'security', label: 'Godmode security', icon: Fingerprint },
];

export function GodmodeShell({
  token: _token,
  onExpired,
}: {
  token: string;
  onExpired: () => void;
}) {
  const { show } = useToast();
  const [section, setSection] = useState('overview');
  const [settings, setSettings] = useState<GodmodeSettingsView | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const view = await godmodeFetch<GodmodeSettingsView>(godmodePaths.settings());
      setSettings(view);
    } catch (err) {
      if (err instanceof GodmodeError && err.status === 401) {
        onExpired();
        return;
      }
      show({ title: 'Failed to load settings', description: String(err), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [onExpired, show]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(() => {
    godmodeFetch(godmodePaths.logout(), { method: 'POST' }).catch(() => undefined);
    clearGodmodeToken();
    onExpired();
  }, [onExpired]);

  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const groupItems = (active.groups ?? [])
    .map((g) => (settings?.items ?? []).filter((i) => i.group === g))
    .flat();

  return (
    <div className="mx-auto grid min-h-svh w-full max-w-[1360px] grid-cols-1 gap-0 md:grid-cols-[260px_1fr]">
      {/* ─── Sidebar ─── */}
      <aside className="border-r border-line bg-white md:min-h-svh">
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <Wordmark withSignature={false} className="text-[16px]" />
          <Badge tone="danger">godmode</Badge>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const activeSection = s.id === section;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2.5 rounded px-3 py-2 text-left text-[13.5px] font-medium transition-colors duration-120 ${
                  activeSection
                    ? 'bg-brand-blue-50 text-brand-blue'
                    : 'text-ink-2 hover:bg-surface-muted hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                {s.label}
              </button>
            );
          })}
          <div className="my-2 border-t border-line" />
          <button
            onClick={logout}
            className="flex items-center gap-2.5 rounded px-3 py-2 text-left text-[13.5px] font-medium text-ink-2 transition-colors duration-120 hover:bg-brand-red-50 hover:text-brand-red"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} />
            Lock godmode
          </button>
        </nav>
      </aside>

      {/* ─── Content ─── */}
      <main className="min-w-0 p-6 md:p-10">
        {loading ? (
          <div className="flex justify-center py-24">
            <LoaderCircle className="h-6 w-6 animate-spin text-ink-3" strokeWidth={2.25} />
          </div>
        ) : (
          <>
            {!settings?.configured ? <OnboardingBanner /> : null}
            <HeaderFor section={active} configured={settings?.configured ?? false} />

            {section === 'overview' && settings ? (
              <OverviewSection
                settings={settings}
                onNavigate={setSection}
                onComplete={async () => {
                  await godmodeFetch(godmodePaths.onboardingComplete(), { method: 'POST' });
                  await load();
                  show({ title: 'Instance configured', description: 'Atlas is ready.', tone: 'success' });
                }}
              />
            ) : null}
            {active.groups ? <SettingsEditor items={groupItems} /> : null}
            {section === 'users' ? <UsersPanel /> : null}
            {section === 'roles' ? <RolesPanel /> : null}
            {section === 'security' ? <SecurityPanel /> : null}
          </>
        )}
      </main>
    </div>
  );
}

function HeaderFor({ section, configured }: { section: Section; configured: boolean }) {
  const Icon = section.icon;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
        <span className="text-eyebrow uppercase text-brand-blue">{section.label}</span>
      </div>
      <h1 className="mt-2 font-display text-display-lg tracking-[-0.02em] text-ink">
        {section.label}
      </h1>
      <p className="mt-1 text-body-sm text-ink-2">
        {section.id === 'overview'
          ? 'Instance-wide configuration. Changes apply immediately — no redeploy.'
          : 'These settings live in the database and apply immediately.'}
      </p>
      {section.id === 'overview' && !configured ? (
        <div className="mt-3 rounded border border-brand-yellow bg-brand-yellow-50 px-4 py-2 text-[13px] text-brand-yellow-ink">
          This instance is not configured yet. Every other page shows a setup screen until
          onboarding completes.
        </div>
      ) : null}
    </div>
  );
}

function OnboardingBanner() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded border border-brand-blue/30 bg-brand-blue-50 px-4 py-3 text-[13.5px] text-ink">
      <BadgeCheck className="h-4 w-4 shrink-0 text-brand-blue" strokeWidth={2.25} />
      <span>
        First-time setup in progress. Follow the steps on the Overview page, then mark the
        instance as configured.
      </span>
    </div>
  );
}

const OVERVIEW_STEPS: {
  id: string;
  title: string;
  description: string;
  action: { label: string; section: string };
}[] = [
  {
    id: 'account',
    title: 'Create the superadmin account',
    description:
      'The first account you create is the instance owner. You will sign into Atlas with it using email + password.',
    action: { label: 'Create superadmin', section: 'users' },
  },
  {
    id: 'site',
    title: 'Set the site name and instance URL',
    description:
      'The instance URL is where users reach Atlas — it is used for magic links, OAuth callbacks, and SAML endpoints.',
    action: { label: 'Open site settings', section: 'site' },
  },
  {
    id: 'auth',
    title: 'Pick sign-in methods',
    description:
      'Enable email + password, magic links, phone OTP, the instance passphrase, and any OAuth providers.',
    action: { label: 'Configure sign-in', section: 'auth' },
  },
  {
    id: 'providers',
    title: 'Configure email, SMS, and storage',
    description:
      'Email powers magic links and notifications. SMS powers phone OTP. Storage powers uploads.',
    action: { label: 'Configure providers', section: 'email' },
  },
  {
    id: 'modules',
    title: 'Enable the modules you want',
    description: 'Turn on the PMO (project management) and voice modules.',
    action: { label: 'Toggle modules', section: 'modules' },
  },
];

function OverviewSection({
  settings,
  onNavigate,
  onComplete,
}: {
  settings: GodmodeSettingsView;
  onNavigate: (section: string) => void;
  onComplete: () => void;
}) {
  const superadminExists = true; // presence check happens on the users page
  const siteConfigured = settings.items.some(
    (i) => i.key === 'system.instanceUrl' && String(i.value ?? '').length > 0,
  );

  return (
    <div className="flex flex-col gap-4">
      {OVERVIEW_STEPS.map((step, idx) => (
        <div
          key={step.id}
          className="flex items-start gap-4 rounded border border-line bg-white p-5 shadow-1"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-50 font-display text-[13px] font-semibold text-brand-blue">
            {idx + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium text-ink">{step.title}</div>
            <p className="mt-1 text-[13px] text-ink-3">{step.description}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate(step.action.section)}>
            {step.action.label}
          </Button>
        </div>
      ))}

      <div className="rounded border border-line bg-white p-5 shadow-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-medium text-ink">Finish onboarding</div>
            <p className="mt-1 max-w-[480px] text-[13px] text-ink-3">
              Marks the instance as configured. Until then, every route shows the setup
              screen with a link here. You can come back and change anything later.
            </p>
          </div>
          <Button onClick={() => void onComplete()}>
            <Settings2 className="h-4 w-4" strokeWidth={2.25} />
            Complete setup
          </Button>
        </div>
      </div>

      {superadminExists && siteConfigured ? null : null}
    </div>
  );
}
