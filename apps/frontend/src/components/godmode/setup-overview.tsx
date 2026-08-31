'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleDashed,
  Info,
  LoaderCircle,
  PartyPopper,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodeSettingsView, GodmodeUser } from '@/lib/godmode/types';

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
  return view.items.some(
    (i) =>
      i.value === true &&
      (i.key === 'auth.emailPassword.enabled' ||
        i.key === 'auth.magicLink.enabled' ||
        i.key === 'auth.phone.enabled' ||
        i.key === 'auth.passphrase.enabled' ||
        i.key === 'sso.oidc.enabled' ||
        i.key === 'sso.saml.enabled' ||
        (i.key.startsWith('auth.oauth.') && i.key.endsWith('.enabled'))),
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
    const siteName = str(settings, 'site.name');
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
        title: 'Name the instance and set its public URL',
        why: 'The name shows in the header and emails. The URL is what magic links, OAuth callbacks, and SSO redirects are built from — a wrong value breaks sign-in.',
        hint: `Site → Site name. The URL lives in Advanced → Public instance URL${
          instanceUrl ? '' : ' (it currently falls back to APP_BASE_URL from .env)'
        }.`,
        done: Boolean(siteName) && Boolean(instanceUrl),
        section: 'site',
        cta: 'Set identity',
      },
      {
        id: 'signin',
        title: 'Turn on at least one way to sign in',
        why: 'Without a sign-in method nobody — including you — can reach the app.',
        hint: 'Email + password is on by default and needs nothing else configured.',
        done: anySignInMethod(settings),
        section: 'auth',
        cta: 'Choose methods',
      },
    ];
  }, [settings, superadminExists]);

  const recommended: Step[] = useMemo(() => {
    const provider = str(settings, 'email.provider');
    const bucket = str(settings, 'storage.s3.bucket');
    const terms = str(settings, 'legal.termsText');
    const privacy = str(settings, 'legal.privacyText');
    return [
      {
        id: 'email',
        title: 'Connect email delivery',
        why: 'Needed for magic links, password resets, invites, and notification emails.',
        hint: 'Until then Atlas prints emails to the server log instead of sending them.',
        done: Boolean(provider) && provider !== 'console',
        section: 'email',
        cta: 'Configure email',
      },
      {
        id: 'storage',
        title: 'Connect file storage',
        why: 'Needed for avatars, chat attachments, and PMO file uploads.',
        hint: 'Any S3-compatible bucket works (AWS S3, Cloudflare R2, MinIO). Uploads return a clear error until this is set.',
        done: Boolean(bucket),
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
          : 'Self-registration is off — you add people from Users & invites, or hand out invite codes.',
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
        section: 'modules',
        cta: 'Toggle modules',
      },
    ];
  }, [settings]);

  const doneCount = required.filter((s) => s.done).length;
  const blockers = required.filter((s) => !s.done);
  const canComplete = blockers.length === 0 && superadminExists !== null;

  if (settings.configured) {
    return (
      <ConfiguredOverview recommended={recommended} onNavigate={onNavigate} />
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
              Three things are required. Everything else can wait until after you are inside.
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
        eyebrow="Recommended — you can do these later"
        steps={recommended}
        onNavigate={onNavigate}
      />

      {/* Finish */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
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
            <Check className="h-4 w-4" strokeWidth={2.25} />
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
                <Check className="h-3 w-3" strokeWidth={3} />
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
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </Button>
        </div>
      ))}
    </section>
  );
}

/** Once configured, the overview stops being a wizard and becomes a status page. */
function ConfiguredOverview({
  recommended,
  onNavigate,
}: {
  recommended: Step[];
  onNavigate: (section: string) => void;
}) {
  const remaining = recommended.filter((s) => !s.done);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-lg border border-brand-green/30 bg-brand-green-50 p-5">
        <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" strokeWidth={2.25} />
        <div>
          <div className="text-[14px] font-medium text-ink">This instance is live</div>
          <p className="mt-1 text-[13px] text-ink-2">
            People can sign in. Every setting on the left applies immediately — no redeploy.
          </p>
        </div>
      </div>

      {remaining.length > 0 ? (
        <StepList
          eyebrow={`Optional — ${remaining.length} left to polish`}
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
