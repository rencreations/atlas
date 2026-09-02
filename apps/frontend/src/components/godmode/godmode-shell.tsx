'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Fingerprint,
  Globe,
  HardDrive,
  KeyRound,
  LayoutGrid,
  Link2,
  LoaderCircle,
  LogOut,
  Mail,
  MessageSquareText,
  Palette,
  Plug,
  Rocket,
  ServerCog,
  ShieldCheck,
  Timer,
  UserPlus,
  Users,
  Webhook,
} from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
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
import { SetupOverview } from './setup-overview';

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  groups?: string[]; // settings groups rendered by this section
  /** Keys inside those groups that another panel owns. */
  excludeKeys?: string[];
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
  { id: 'storage', label: 'Storage', icon: HardDrive, groups: ['storage'] },
  { id: 'integrations', label: 'Integrations', icon: Webhook, groups: ['integrations'] },
  { id: 'appearance', label: 'Appearance', icon: Palette, groups: ['appearance'] },
  { id: 'modules', label: 'Modules', icon: Rocket, groups: ['modules'] },
  { id: 'users', label: 'Users & invites', icon: Users },
  { id: 'roles', label: 'Roles & permissions', icon: ShieldCheck },
  { id: 'security', label: 'Godmode security', icon: Fingerprint },
  // `system` and `godmode` used to have no section at all, which left
  // system.instanceUrl (referenced by onboarding) and the godmode session
  // TTL unreachable from the UI. TOTP is deliberately excluded: Godmode
  // security owns the enrolment flow, and toggling `totp.enabled` or
  // editing the raw secret from a generic editor can desync or disable
  // 2FA without ever verifying a code.
  {
    id: 'advanced',
    label: 'Advanced',
    icon: ServerCog,
    groups: ['system', 'godmode'],
    excludeKeys: ['godmode.totp.enabled', 'godmode.totp.secret'],
  },
];

export function GodmodeShell({
  token: _token,
  onExpired,
}: {
  token: string;
  onExpired: () => void;
}) {
  const { show } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<GodmodeSettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [completing, setCompleting] = useState(false);

  // The section lives in the URL so godmode panels can be linked to and
  // the browser Back button steps between them instead of leaving godmode.
  const requested = searchParams.get('section') ?? 'overview';
  const section = SECTIONS.some((s) => s.id === requested) ? requested : 'overview';

  const applySection = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'overview') params.delete('section');
      else params.set('section', next);
      const qs = params.toString();
      router.replace(`/godmode${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, searchParams],
  );

  const navigate = (next: string) => {
    if (next === section) return;
    if (dirty) {
      void (async () => {
        const ok = await confirm({
          title: 'Discard unsaved changes?',
          description: 'The edits you made in this panel have not been saved yet.',
          confirmLabel: 'Discard changes',
        });
        if (!ok) return;
        setDirty(false);
        applySection(next);
      })();
      return;
    }
    applySection(next);
  };

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
      show({
        title: 'Could not load settings',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
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
  // Stable identity matters: SettingsEditor resets its local edits when the
  // items array it receives changes. Building this inline gave it a fresh
  // array on every render, so each keystroke re-ran the reset and reverted
  // the field (the Save button flashed for one frame). Memoize so identity
  // only changes when the section or the fetched settings actually change.
  const groupItems = useMemo(() => {
    const excluded = new Set(active.excludeKeys ?? []);
    return (active.groups ?? [])
      .map((g) => (settings?.items ?? []).filter((i) => i.group === g && !excluded.has(i.key)))
      .flat();
  }, [active, settings]);

  return (
    <div className="mx-auto grid min-h-svh w-full max-w-[1360px] grid-cols-1 gap-0 md:grid-cols-[260px_1fr]">
      {/* ─── Sidebar ─── */}
      <aside className="border-r border-line bg-surface md:min-h-svh">
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
                onClick={() => navigate(s.id)}
                aria-current={activeSection ? 'page' : undefined}
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
            <HeaderFor section={active} configured={settings?.configured ?? false} />

            {section === 'overview' && settings ? (
              <SetupOverview
                settings={settings}
                onNavigate={navigate}
                completing={completing}
                onComplete={() => {
                  void (async () => {
                    setCompleting(true);
                    try {
                      await godmodeFetch(godmodePaths.onboardingComplete(), { method: 'POST' });
                      await load();
                      show({
                        title: 'Atlas is live',
                        description: 'People can sign in now.',
                        tone: 'success',
                      });
                    } catch (err) {
                      show({
                        title: 'Could not finish setup',
                        description: err instanceof Error ? err.message : 'Unknown error.',
                        tone: 'danger',
                      });
                    } finally {
                      setCompleting(false);
                    }
                  })();
                }}
              />
            ) : null}
            {active.groups ? (
              <SettingsEditor
                items={groupItems}
                onDirtyChange={setDirty}
                onSaved={() => void load()}
                advancedByDefault={active.id === 'advanced'}
              />
            ) : null}
            {section === 'users' ? (
              <UsersPanel configured={settings?.configured ?? false} />
            ) : null}
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
      {/* The eyebrow used to repeat the h1 verbatim on every panel. */}
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand-blue" strokeWidth={2.25} />
        <h1 className="font-display text-display-lg tracking-[-0.02em] text-ink">
          {section.label}
        </h1>
      </div>
      <p className="mt-1 text-body-sm text-ink-2">
        {section.id === 'overview'
          ? 'Instance-wide configuration. Changes apply immediately — no redeploy.'
          : 'These settings live in the database and apply immediately.'}
      </p>
      {/* On Overview the progress card already says this; elsewhere it is a
          useful reminder that the app is still gated. */}
      {section.id !== 'overview' && !configured ? (
        <div className="mt-3 rounded border border-brand-yellow bg-brand-yellow-50 px-4 py-2 text-[13px] text-brand-yellow-ink">
          Setup is not finished — Atlas still shows the setup screen to everyone. Return to
          Overview to finish.
        </div>
      ) : null}
    </div>
  );
}
