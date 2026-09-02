'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  KeyRound,
  LoaderCircle,
  Mail,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { sanitizeReturnTo } from '@/lib/auth-redirect';
import { apiPaths } from '@/lib/api/paths';
import { storeSession } from '@/lib/auth-client';
import { usePageTitle } from '@/lib/page-title';
import { cn } from '@/lib/utils';
import type { PublicConfig } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** sessionStorage key used to carry the intended destination through the
 *  magic-link round-trip (consumed by /auth/magic-link). */
export const MAGIC_CALLBACK_KEY = 'atlas_magic_callback';

type View = 'password' | 'magic-link' | 'phone' | 'passphrase' | 'must-change';

interface SessionResponse {
  sessionId: string;
  expiresAt: string;
  user: unknown;
  mustChangePassword?: boolean;
}

const METHOD_DEFS: {
  view: View;
  configKey: 'magicLink' | 'phone' | 'passphrase';
  label: string;
  icon: LucideIcon;
}[] = [
  { view: 'magic-link', configKey: 'magicLink', label: 'Magic link', icon: Mail },
  { view: 'phone', configKey: 'phone', label: 'Phone OTP', icon: MessageSquareText },
  { view: 'passphrase', configKey: 'passphrase', label: 'Passphrase', icon: KeyRound },
];

export function LoginClient({
  config,
  callbackUrl,
}: {
  config: PublicConfig;
  callbackUrl?: string;
}) {
  usePageTitle('Sign in');
  const router = useRouter();

  const enabledViews = useMemo<View[]>(() => {
    const views: View[] = [];
    if (config.authMethods.password.enabled) views.push('password');
    if (config.authMethods.magicLink.enabled) views.push('magic-link');
    if (config.authMethods.phone.enabled) views.push('phone');
    if (config.authMethods.passphrase.enabled) views.push('passphrase');
    return views;
  }, [config.authMethods]);

  // When password auth is disabled, start on the first enabled method.
  const [view, setView] = useState<View>(() =>
    config.authMethods.password.enabled ? 'password' : (enabledViews[0] ?? 'password'),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // ─── password view state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // ─── must-change state
  const [newPassword, setNewPassword] = useState('');
  const [pendingSession, setPendingSession] = useState<SessionResponse | null>(null);
  // ─── magic link state
  const [magicEmail, setMagicEmail] = useState('');
  // ─── phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  // ─── passphrase state
  const [passphrase, setPassphrase] = useState('');

  const safeCallback = useMemo(() => sanitizeReturnTo(callbackUrl) ?? '/dashboard', [callbackUrl]);

  // View when "Back to sign-in" is pressed: the password view when it
  // exists, otherwise the first enabled method.
  const fallbackView: View = config.authMethods.password.enabled
    ? 'password'
    : (enabledViews[0] ?? 'password');

  // After a failed submit, move focus to the error box so screen readers
  // and keyboard users hear the message instead of missing it.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearInvalid = useCallback(() => setInvalid([]), []);

  /** Every view switch clears stale error/notice (and OTP state) so one
   *  method's message never bleeds into another. */
  const switchView = useCallback((v: View) => {
    setError(null);
    setNotice(null);
    setInvalid([]);
    setOtpSent(false);
    setView(v);
  }, []);

  const finishSession = useCallback(
    (session: SessionResponse) => {
      storeSession({
        sessionId: session.sessionId,
        expiresAt: new Date(session.expiresAt),
        user: session.user as never,
      });
      router.push(safeCallback as never);
    },
    [router, safeCallback],
  );

  const post = useCallback(async <T,>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? `Request failed (${res.status}).`),
      );
    }
    return data as T;
  }, []);

  const submitPassword = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await post<SessionResponse>(apiPaths.auth.loginPassword(), { email, password });
      if (session.mustChangePassword) {
        setPendingSession(session);
        switchView('must-change');
      } else {
        finishSession(session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setInvalid(['login-email', 'login-password']);
    } finally {
      setBusy(false);
    }
  }, [email, password, finishSession, post, switchView]);

  const submitMustChange = useCallback(async () => {
    if (!pendingSession) return;
    setBusy(true);
    setError(null);
    try {
      // mustChange sessions may change the password without re-entering
      // the current one (they just proved possession by signing in).
      await post(apiPaths.auth.passwordChange(), { newPassword });
      finishSession(pendingSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed.');
      setInvalid(['new-password']);
      setBusy(false);
    }
  }, [pendingSession, newPassword, finishSession, post]);

  const requestMagicLink = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // Stash the intended destination so the emailed link lands the user
      // back where they were (see /auth/magic-link).
      sessionStorage.setItem(MAGIC_CALLBACK_KEY, safeCallback);
      await post(apiPaths.auth.magicLinkRequest(), { email: magicEmail });
      setNotice(`If an account exists for ${magicEmail}, a sign-in link is on its way.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
      setInvalid(['magic-email']);
    } finally {
      setBusy(false);
    }
  }, [magicEmail, post, safeCallback]);

  const requestOtp = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await post(apiPaths.auth.phoneOtpRequest(), { phone, purpose: 'login' });
      setOtpSent(true);
      setNotice('Enter the code we sent to your phone.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
      setInvalid(['login-phone']);
    } finally {
      setBusy(false);
    }
  }, [phone, post]);

  const submitOtp = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await post<SessionResponse>(apiPaths.auth.phoneOtpVerify(), {
        phone,
        code: otp,
        purpose: 'login',
      });
      finishSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setInvalid(['login-otp']);
      setBusy(false);
    }
  }, [phone, otp, finishSession, post]);

  const submitPassphrase = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await post<SessionResponse>(apiPaths.auth.loginPassphrase(), { passphrase });
      finishSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setInvalid(['login-passphrase']);
      setBusy(false);
    }
  }, [passphrase, finishSession, post]);

  const handleProviderClick = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (redirecting) {
        e.preventDefault();
        return;
      }
      const label = e.currentTarget.dataset.providerLabel ?? '';
      e.preventDefault();
      setRedirecting(label);
      // Navigate after a paint so the busy state is visible.
      window.setTimeout(() => {
        window.location.assign(e.currentTarget.href);
      }, 0);
    },
    [redirecting],
  );

  const showOAuth = config.oauthProviders.length > 0;
  const showSso = config.sso.oidc.enabled || config.sso.saml.enabled;
  const dividerNeeded = showOAuth || showSso;
  // With password auth off the provider links must still be reachable from
  // whichever view we defaulted to.
  const showProviderBlock = (view === 'password' || !config.authMethods.password.enabled) && dividerNeeded;

  const providerLinkClass =
    'flex h-10 w-full items-center justify-center gap-2 rounded border border-line bg-surface text-[14px] font-medium text-ink transition-[border-color,background-color,opacity] duration-120 hover:border-line-strong hover:bg-surface-muted';

  const switcherGrid =
    config.authMethods.magicLink.enabled || config.authMethods.phone.enabled || config.authMethods.passphrase.enabled ? (
      <div className="grid grid-cols-2 gap-2">
        {METHOD_DEFS.filter((m) => config.authMethods[m.configKey].enabled).map((m) => (
          <Button
            key={m.view}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => switchView(m.view)}
          >
            <m.icon className="h-4 w-4" strokeWidth={2.25} />
            {m.label}
          </Button>
        ))}
      </div>
    ) : null;

  return (
    <div className="mt-6">
      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="mb-4 rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13px] text-ink"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="mb-4 rounded border border-brand-blue/30 bg-brand-blue-50 px-4 py-3 text-[13px] text-ink"
        >
          {notice}
        </div>
      ) : null}

      {enabledViews.length === 0 ? (
        <div className="rounded border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-2">
          No sign-in methods are enabled on this instance. Contact your administrator.
        </div>
      ) : null}

      {view === 'password' && config.authMethods.password.enabled ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitPassword();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              invalid={invalid.includes('login-email')}
              value={email}
              onChange={(e) => {
                clearInvalid();
                setEmail(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <Link
                href={'/auth/forgot-password' as never}
                className="-my-2 inline-block py-2 text-[12px] font-medium text-brand-blue hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              invalid={invalid.includes('login-password')}
              value={password}
              onChange={(e) => {
                clearInvalid();
                setPassword(e.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={!email || !password || busy} size="lg" className="w-full">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            Sign in
          </Button>
          {switcherGrid}
        </form>
      ) : null}

      {view === 'magic-link' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void requestMagicLink();
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-[13px] text-ink-2">
            We&apos;ll email you a one-time link that signs you in instantly.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="magic-email">Email</Label>
            <Input
              id="magic-email"
              type="email"
              autoComplete="email"
              invalid={invalid.includes('magic-email')}
              value={magicEmail}
              onChange={(e) => {
                clearInvalid();
                setMagicEmail(e.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={!magicEmail || busy} size="lg" className="w-full">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            Email me a link
          </Button>
          <button
            type="button"
            onClick={() => switchView(fallbackView)}
            className="flex items-center justify-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Back to sign-in
          </button>
          {!config.authMethods.password.enabled ? switcherGrid : null}
        </form>
      ) : null}

      {view === 'phone' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (otpSent) void submitOtp();
            else void requestOtp();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-phone">Phone number</Label>
            <Input
              id="login-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+15551234567"
              invalid={invalid.includes('login-phone')}
              value={phone}
              disabled={otpSent}
              onChange={(e) => {
                clearInvalid();
                setPhone(e.target.value);
              }}
            />
          </div>
          {otpSent ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-otp">One-time code</Label>
              <Input
                id="login-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                invalid={invalid.includes('login-otp')}
                value={otp}
                onChange={(e) => {
                  clearInvalid();
                  setOtp(e.target.value.replace(/\D/g, ''));
                }}
              />
              <p className="text-[12px] text-ink-3">4–6 digit code</p>
            </div>
          ) : null}
          <Button type="submit" disabled={!phone || busy || (otpSent && otp.length < 4)} size="lg" className="w-full">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            {otpSent ? 'Verify & sign in' : 'Send code'}
          </Button>
          {otpSent ? (
            <p className="text-center text-[12px] text-ink-3">
              Didn&apos;t receive the code? Go back and request a new one.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => switchView(fallbackView)}
            className="flex items-center justify-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Back to sign-in
          </button>
          {!config.authMethods.password.enabled ? switcherGrid : null}
        </form>
      ) : null}

      {view === 'passphrase' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitPassphrase();
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-[13px] text-ink-2">
            Enter the shared instance passphrase configured by the admin.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-passphrase">Passphrase</Label>
            <PasswordInput
              id="login-passphrase"
              invalid={invalid.includes('login-passphrase')}
              value={passphrase}
              onChange={(e) => {
                clearInvalid();
                setPassphrase(e.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={!passphrase || busy} size="lg" className="w-full">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            Enter
          </Button>
          <button
            type="button"
            onClick={() => switchView(fallbackView)}
            className="flex items-center justify-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Back to sign-in
          </button>
          {!config.authMethods.password.enabled ? switcherGrid : null}
        </form>
      ) : null}

      {view === 'must-change' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitMustChange();
          }}
          className="flex flex-col gap-4"
        >
          <div className="rounded border border-brand-yellow bg-brand-yellow-50 px-4 py-3 text-[13px] text-brand-yellow-ink">
            Your account uses a temporary password. Choose a new one to continue.
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              invalid={invalid.includes('new-password')}
              value={newPassword}
              onChange={(e) => {
                clearInvalid();
                setNewPassword(e.target.value);
              }}
            />
            <p className="text-[12px] text-ink-3">At least 6 characters</p>
          </div>
          <Button type="submit" disabled={newPassword.length < 6 || busy} size="lg" className="w-full">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            Set password & continue
          </Button>
          <button
            type="button"
            onClick={() => {
              setPendingSession(null);
              switchView(fallbackView);
            }}
            className="flex items-center justify-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink"
          >
            Sign out instead
          </button>
        </form>
      ) : null}

      {/* ─── OAuth / SSO ─── */}
      {showProviderBlock ? (
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            or continue with
          </span>
          <div className="h-px flex-1 bg-line" />
        </div>
      ) : null}

      {showProviderBlock && (showOAuth || showSso) ? (
        <div className="flex flex-col gap-2">
          {config.oauthProviders.map((p) => (
            <a
              key={p.id}
              href={`${API_BASE}/auth/oauth/${p.id}/start?callbackUrl=${encodeURIComponent(safeCallback)}`}
              data-provider-label={p.label}
              onClick={handleProviderClick}
              aria-disabled={redirecting !== null}
              className={cn(providerLinkClass, redirecting !== null && 'pointer-events-none opacity-60')}
            >
              {redirecting === p.label ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-ink-3" strokeWidth={2.25} />
              ) : (
                <OAuthGlyph id={p.id} />
              )}
              {redirecting === p.label ? `Redirecting to ${p.label}…` : `Continue with ${p.label}`}
            </a>
          ))}
          {config.sso.oidc.enabled ? (
            <a
              href={`${API_BASE}/auth/oidc/start?callbackUrl=${encodeURIComponent(safeCallback)}`}
              data-provider-label={config.sso.oidc.label}
              onClick={handleProviderClick}
              aria-disabled={redirecting !== null}
              className={cn(providerLinkClass, redirecting !== null && 'pointer-events-none opacity-60')}
            >
              {redirecting === config.sso.oidc.label ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-ink-3" strokeWidth={2.25} />
              ) : (
                <ShieldCheck className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
              )}
              {redirecting === config.sso.oidc.label
                ? `Redirecting to ${config.sso.oidc.label}…`
                : config.sso.oidc.label}
            </a>
          ) : null}
          {config.sso.saml.enabled ? (
            <a
              href={`${API_BASE}/auth/saml/start?callbackUrl=${encodeURIComponent(safeCallback)}`}
              data-provider-label={config.sso.saml.label}
              onClick={handleProviderClick}
              aria-disabled={redirecting !== null}
              className={cn(providerLinkClass, redirecting !== null && 'pointer-events-none opacity-60')}
            >
              {redirecting === config.sso.saml.label ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-ink-3" strokeWidth={2.25} />
              ) : (
                <ShieldCheck className="h-4 w-4 text-brand-green" strokeWidth={2.25} />
              )}
              {redirecting === config.sso.saml.label
                ? `Redirecting to ${config.sso.saml.label}…`
                : config.sso.saml.label}
            </a>
          ) : null}
        </div>
      ) : null}

      {config.registration.enabled && view === 'password' ? (
        <p className="mt-5 text-center text-[13px] text-ink-3">
          New here?{' '}
          <Link
            href={'/register' as never}
            className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline"
          >
            Create an account
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Minimal single-letter provider glyphs (stroke icons only, per the design system). */
function OAuthGlyph({ id }: { id: string }) {
  const letter = id.charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-muted font-display text-[11px] font-semibold text-ink-2"
    >
      {letter}
    </span>
  );
}
