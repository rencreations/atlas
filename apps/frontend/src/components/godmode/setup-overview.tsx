'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleDashed, Info, LoaderCircle } from 'lucide-react';
import { ArrowRightIcon } from '@/components/icons/animated/arrow-right';
import { CheckIcon } from '@/components/icons/animated/check';
import { RocketIcon } from '@/components/icons/animated/rocket';
import { Button } from '@/components/ui/button';
import { PartyPopperIcon } from '@/components/icons/animated/party-popper';
import { ConfettiBurst } from './confetti-burst';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodeInstanceStats, GodmodeSettingsView, GodmodeUser } from '@/lib/godmode/types';

/** A setup step whose completion is derived from live instance state. */
interface Step {
  id: string;
  title: string;
  /** One line: what this unlocks. Written for someone who has never seen Atlas. */
  why: string;
  /** Extra guidance shown only while the step is incomplete. */
  hint?: string;
  done: boolean;
  section: string;
  cta: string;
}

function str(view: GodmodeSettingsView, key: string): string {
  const item = view.items.find((i) => i.key === key);
  const v = item?.value ?? item?.defaultValue;
  return typeof v === 'string' ? v.trim() : '';
}

function bool(view: GodmodeSettingsView, key: string): boolean {
  const item = view.items.find((i) => i.key === key);
  return Boolean(item?.value ?? item?.defaultValue);
}

/** True when at least one way to sign in is switched on. */
function anySignInMethod(view: GodmodeSettingsView): boolean {
  return (
    (view.ssoConnections ?? []).some((c) => c.enabled) ||
    view.items.some(
      (i) =>
        i.value === true &&
        (i.key === 'auth.emailPassword.enabled' ||
          i.key === 'auth.magicLink.enabled' ||
          i.key === 'auth.phone.enabled' ||
          i.key === 'auth.passphrase.enabled' ||
          i.key === 'sso.oidc.enabled' ||
          i.key === 'sso.saml.enabled' ||
          (i.key.startsWith('auth.oauth.') && i.key.endsWith('.enabled'))),
    )
  );
}

export function SetupOverview({
  settings,
  onNavigate,
  onComplete,
  completing,
}: {
  settings: GodmodeSettingsView;
  onNavigate: (section: string) => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const [superadminExists, setSuperadminExists] = useState<boolean | null>(null);
  const [usersError, setUsersError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    godmodeFetch<GodmodeUser[]>(godmodePaths.users())
      .then((users) => {
        if (cancelled) return;
        setUsersError(false);
        setSuperadminExists(
          users.some((u) => u.userRoles.some((ur) => ur.role.code === 'superadmin')),
        );
      })
      .catch(() => {
        // Don't claim "no superadmin" when we simply could not check.
        if (!cancelled) setUsersError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [settings]);

  const required: Step[] = useMemo(() => {
    const instanceUrl = str(settings, 'system.instanceUrl');
    return [
      {
        id: 'account',
        title: 'Create your superadmin account',
        why: 'This is the account you will sign into Atlas with. The first one created owns the instance.',
        hint: 'Users & invites → Add user. Pick any password you like; you can change it later in Settings.',
        done: superadminExists === true,
        section: 'users',
        cta: 'Create account',
      },
      {
        id: 'identity',
        title: 'Set the public URL',
        why: 'Magic links, OAuth callbacks, and SSO redirects are all built from this URL. A wrong value breaks sign-in.',
        hint: `Advanced → Public instance URL${
          instanceUrl ? '' : ' (it currently falls back to APP_BASE_URL from .env)'
        }.`,
        done: Boolean(instanceUrl),
        section: 'advanced',
        cta: 'Set URL',
      },
      {
        id: 'signin',
        title: 'Turn on at least one way to sign in',
        why: 'Without a sign-in method nobody, including you, can reach the app.',
        hint: 'Email + password is on by default and needs nothing else configured.',
        done: anySignInMethod(settings),
        section: 'auth',
        cta: 'Choose methods',
      },
    ];
  }, [settings, superadminExists]);

  const recommended: Step[] = useMemo(() => {
    const emailProvider = str(settings, 'email.provider');
    const smsProvider = str(settings, 'sms.provider');
    const storageProvider = str(settings, 'storage.provider');
    const terms = str(settings, 'legal.termsText');
    const privacy = str(settings, 'legal.privacyText');
    return [
      {
        id: 'email',
        title: 'Connect email delivery',
        why: 'Optional, but magic links, password resets, invites, and verification emails all need a real mail provider to actually arrive.',
        hint: 'Email → pick SMTP, Resend, or AWS SES and fill in its credentials. Until then Atlas only prints mail to the server log.',
        done: Boolean(emailProvider) && emailProvider !== 'console',
        section: 'email',
        cta: 'Configure email',
      },
      {
        id: 'sms',
        title: 'Connect SMS / OTP delivery',
        why: 'Optional, only needed if you want phone sign-in or one-time codes by text.',
        hint: 'SMS / OTP → pick Twilio, Vonage, Infobip, Sinch, or MessageBird and fill in its credentials.',
        done: Boolean(smsProvider) && smsProvider !== 'console',
        section: 'sms',
        cta: 'Configure SMS',
      },
      {
        id: 'storage',
        title: 'Choose file storage',
        why: 'Uploads (avatars, chat attachments, PMO files) are kept on the server disk by default. Move them to AWS S3 or Cloudflare R2 when you need scale.',
        hint: 'Switching providers copies every existing file in the background first, nothing breaks.',
        done: Boolean(storageProvider) && storageProvider !== 'disabled',
        section: 'storage',
        cta: 'Configure storage',
      },
      {
        id: 'legal',
        title: 'Publish your terms and privacy policy',
        why: 'Settings → Privacy links to these pages; they return 404 while empty.',
        done: Boolean(terms) && Boolean(privacy),
        section: 'site',
        cta: 'Write documents',
      },
      {
        id: 'access',
        title: 'Decide who can join',
        why: bool(settings, 'registration.enabled')
          ? 'Self-registration is on.'
          : 'Self-registration is off, you add people from Users & invites, or hand out invite codes.',
        done: true,
        section: 'registration',
        cta: 'Review policy',
      },
      {
        id: 'modules',
        title: 'Enable the modules you want',
        why: `PMO (tasks, notes, whiteboards) is ${
          bool(settings, 'modules.pmo.enabled') ? 'on' : 'off'
        }; voice/video is ${bool(settings, 'modules.voice.enabled') ? 'on' : 'off'}.`,
        done: true,
        section: 'site',
        cta: 'Toggle modules',
      },
    ];
  }, [settings]);

  const doneCount = required.filter((s) => s.done).length;
  const blockers = required.filter((s) => !s.done);
  const canComplete = blockers.length === 0 && superadminExists !== null;

  // The live-site URL the deployer configured; the origin is the fallback.
  const liveUrl =
    str(settings, 'system.instanceUrl') ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  if (settings.configured) {
    return (
      <ConfiguredOverview
        recommended={recommended}
        liveUrl={liveUrl}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 text-ink">Finish setting up Atlas</h2>
            <p className="mt-1 text-[13px] text-ink-2">
              {required.length} things are required. Everything else, including email and SMS,
              can wait until after you are inside.
            </p>
          </div>
          <span className="text-[13px] font-medium text-ink-2" aria-live="polite">
            {doneCount} of {required.length} done
          </span>
        </div>
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={required.length}
          aria-label="Required setup progress"
        >
          <div
            className="h-full rounded-full bg-brand-blue-strong transition-[width] duration-320"
            style={{ width: `${(doneCount / required.length) * 100}%` }}
          />
        </div>
      </div>

      {usersError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded border border-brand-yellow bg-brand-yellow-50 px-4 py-3 text-[13px] text-brand-yellow-ink"
        >
          <Info className="mt-px h-4 w-4 shrink-0" strokeWidth={2.25} />
          <span>
            Could not check existing accounts just now, so step 1 may be out of date. Reload to
            try again.
          </span>
        </div>
      ) : null}

      <StepList
        eyebrow="Required"
        steps={required}
        loading={superadminExists === null && !usersError}
        onNavigate={onNavigate}
      />

      <StepList
        eyebrow="Recommended, you can do these later"
        steps={recommended}
        onNavigate={onNavigate}
      />

      {/* Finish */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <RocketIcon size={16} className="flex items-center justify-center text-brand-blue" />
              <span className="text-[14px] font-medium text-ink">Open Atlas to everyone</span>
            </div>
            <p className="mt-1 max-w-[520px] text-[13px] text-ink-3">
              {canComplete
                ? 'Removes the setup screen and lets people sign in. You can keep changing every setting here afterwards.'
                : 'Finish the required steps above and this unlocks.'}
            </p>
            {blockers.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1">
                {blockers.map((b) => (
                  <li key={b.id} className="text-[12.5px] text-brand-red">
                    Still needed: {b.title.toLowerCase()}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Button
            onClick={onComplete}
            disabled={!canComplete || completing}
            loading={completing}
          >
            <CheckIcon size={16} className="flex items-center justify-center" />
            Finish setup
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepList({
  eyebrow,
  steps,
  loading,
  onNavigate,
}: {
  eyebrow: string;
  steps: Step[];
  loading?: boolean;
  onNavigate: (section: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-eyebrow uppercase text-ink-3">{eyebrow}</h3>
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-start gap-4 rounded border border-line bg-surface p-4 shadow-1"
        >
          <span className="mt-0.5 shrink-0" aria-hidden={false}>
            {loading ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-ink-4" strokeWidth={2.25} />
            ) : step.done ? (
              <span
                className="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-green-strong text-white"
                role="img"
                aria-label="Done"
              >
                <CheckIcon size={12} className="flex items-center justify-center" />
              </span>
            ) : (
              <CircleDashed
                className="h-5 w-5 text-ink-4"
                strokeWidth={2.25}
                role="img"
                aria-label="Not done yet"
              />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium text-ink">{step.title}</div>
            <p className="mt-1 text-[13px] text-ink-3">{step.why}</p>
            {!step.done && step.hint ? (
              <p className="mt-1.5 text-[12.5px] text-ink-4">{step.hint}</p>
            ) : null}
          </div>
          <Button
            variant={step.done ? 'ghost' : 'secondary'}
            size="sm"
            className="shrink-0"
            onClick={() => onNavigate(step.section)}
          >
            {step.done ? 'Review' : step.cta}
            <ArrowRightIcon size={14} className="flex items-center justify-center" />
          </Button>
        </div>
      ))}
    </section>
  );
}

/** Once configured, the overview stops being a wizard and becomes a status page. */
function ConfiguredOverview({
  recommended,
  liveUrl,
  onNavigate,
}: {
  recommended: Step[];
  liveUrl: string;
  onNavigate: (section: string) => void;
}) {
  const remaining = recommended.filter((s) => !s.done);
  const [stats, setStats] = useState<GodmodeInstanceStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    godmodeFetch<GodmodeInstanceStats>(godmodePaths.stats())
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex flex-wrap items-start justify-between gap-3 overflow-hidden rounded-lg border border-brand-green/30 bg-brand-green-50 p-5">
        {/* One celebratory burst per session when the admin sees the live state. */}
        <ConfettiBurst oncePerSessionKey="atlas-live-confetti" className="absolute inset-0 h-full w-full" />
        <div className="relative flex items-start gap-3">
          <span className="mt-0.5 inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-green-strong/10">
            <PartyPopperIcon size={20} className="flex items-center justify-center" />
          </span>
          <div>
            <div className="text-[14px] font-medium text-ink">This instance is live</div>
            <p className="mt-1 max-w-[560px] text-[13px] text-ink-2">
              People can sign in. Every setting on the left applies immediately, no redeploy.
            </p>
          </div>
        </div>
        {liveUrl ? (
          <Button size="sm" asChild className="relative">
            <a href={liveUrl} target="_blank" rel="noreferrer">
              See the live site
            </a>
          </Button>
        ) : null}
      </div>

      <GrowthChecklist stats={stats} liveUrl={liveUrl} onNavigate={onNavigate} />

      {remaining.length > 0 ? (
        <StepList
          eyebrow={`Optional, ${remaining.length} left to polish`}
          steps={remaining}
          onNavigate={onNavigate}
        />
      ) : (
        <p className="text-[13px] text-ink-3">
          Everything on the recommended list is configured too. Nice.
        </p>
      )}
    </div>
  );
}

interface GrowthStep {
  id: string;
  title: string;
  why: string;
  done: boolean;
  cta: string;
  onClick: () => void;
}

/**
 * "What to try next" suggestions once the instance is live, introduced one
 * at a time as the admin makes progress instead of a full product-tour
 * checklist dumped on them at once. Finished ones collapse to a small
 * checkmark strip; only the current step gets a full card.
 */
function GrowthChecklist({
  stats,
  liveUrl,
  onNavigate,
}: {
  stats: GodmodeInstanceStats | null;
  liveUrl: string;
  onNavigate: (section: string) => void;
}) {
  if (!stats) return null;

  const steps: GrowthStep[] = [
    {
      id: 'project',
      title: 'Create your first project',
      why: 'Projects are where chat, tasks, and files actually live, there is nothing to show your team until one exists.',
      done: stats.projectCount > 0,
      cta: 'New project',
      onClick: () => liveUrl && window.open(`${liveUrl}/projects/new`, '_blank', 'noreferrer'),
    },
    {
      id: 'team',
      title: 'Invite your team',
      why: 'Right now it’s just your account. Add people directly or hand out an invite code.',
      done: stats.userCount > 1,
      cta: 'Users & invites',
      onClick: () => onNavigate('users'),
    },
    {
      id: 'chat',
      title: 'Send your first message',
      why: 'See what people will actually use day to day.',
      done: stats.chatMessageCount > 0,
      cta: 'Open the live site',
      onClick: () => liveUrl && window.open(liveUrl, '_blank', 'noreferrer'),
    },
  ];

  const current = steps.find((s) => !s.done);
  const finished = steps.filter((s) => s.done);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-eyebrow uppercase text-ink-3">Get started</h3>
        <span className="text-[12px] text-ink-4">
          {finished.length} of {steps.length} done
        </span>
      </div>

      {current ? (
        <div className="flex items-start gap-4 rounded border border-line bg-surface p-4 shadow-1">
          <CircleDashed
            className="mt-0.5 h-5 w-5 shrink-0 text-ink-4"
            strokeWidth={2.25}
            role="img"
            aria-label="Not done yet"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium text-ink">{current.title}</div>
            <p className="mt-1 text-[13px] text-ink-3">{current.why}</p>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={current.onClick}>
            {current.cta}
            <ArrowRightIcon size={14} className="flex items-center justify-center" />
          </Button>
        </div>
      ) : (
        <p className="rounded border border-line bg-surface p-4 text-[13px] text-ink-3 shadow-1">
          You’ve done all the getting-started basics, Atlas is in daily use.
        </p>
      )}

      {finished.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
          {finished.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-[12px] text-ink-4">
              <CheckIcon size={11} className="flex items-center justify-center text-brand-green" />
              {s.title}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
