'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { apiPaths } from '@/lib/api/paths';
import { usePageTitle } from '@/lib/page-title';
import type { PublicConfig } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function RegisterPage() {
  usePageTitle('Create an account');
  const router = useRouter();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  /** True once the invite code checked out; gates the account form. */
  const [inviteVerified, setInviteVerified] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);

  const loadConfig = useCallback(() => {
    setConfigFailed(false);
    fetch(`${API_BASE}${apiPaths.publicConfig()}`)
      .then((r) => {
        // A non-2xx can still carry a valid (but differently-shaped)
        // JSON body, e.g. NestJS's default {statusCode, message} error
        // envelope. Parsing that as PublicConfig wouldn't throw here,
        // it would throw later during render against the wrong shape.
        // Reject on a bad status before ever parsing the body.
        if (!r.ok) throw new Error(`Request failed (${r.status}).`);
        return r.json() as Promise<PublicConfig>;
      })
      .then(setConfig)
      .catch(() => setConfigFailed(true));
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const clearInvalid = useCallback(() => setInvalid([]), []);

  // Step 1 of the invite flow: check the code without consuming it, then
  // reveal the account form. The code is validated again (and consumed)
  // when the account is actually created.
  const checkInvite = useCallback(async () => {
    setCheckingInvite(true);
    setInviteError(null);
    try {
      const res = await fetch(`${API_BASE}${apiPaths.auth.inviteCheck()}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : (data?.message ?? 'Invalid or expired invite code.'),
        );
      }
      setInviteVerified(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invalid or expired invite code.');
    } finally {
      setCheckingInvite(false);
    }
  }, [inviteCode]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${apiPaths.auth.register()}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          inviteCode: inviteCode || undefined,
          ...(config?.legal.requireConsent ? { acceptedTerms } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : (data?.message ?? 'Registration failed.'),
        );
      }
      if (data?.emailVerificationSent) {
        router.push('/login?error=check_your_email' as never);
        return;
      }
      // Sessionless registration: send the new user to sign in.
      router.push('/login' as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
      setInvalid(['reg-email', 'reg-password']);
      setBusy(false);
    }
  }, [name, email, password, inviteCode, acceptedTerms, config?.legal.requireConsent, router]);

  if (configFailed) {
    return (
      <AuthShell
        title="Create an account"
        footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
      >
        <ErrorState
          title="Couldn't load sign-up settings"
          message="The registration service didn't respond. Check your connection and try again."
          onRetry={loadConfig}
        />
      </AuthShell>
    );
  }

  if (!config) {
    return (
      <AuthShell title="Create an account">
        <div className="flex justify-center py-2">
          <LoaderCircle className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
        </div>
      </AuthShell>
    );
  }

  if (!config.registration.enabled) {
    return (
      <AuthShell
        title="Registration is closed"
        subtitle="This instance does not allow self-registration. Ask an admin for an invite or an account."
        footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
      >
        <div />
      </AuthShell>
    );
  }

  // Invite-first flow: ask for the code before showing anything else so
  // nobody fills out the whole form just to learn an invite is required.
  if (config.registration.inviteRequired && !inviteVerified) {
    return (
      <AuthShell
        title="Enter your invite code"
        subtitle="This instance requires an invite code to create an account. Ask an admin if you don't have one."
        footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Already have an account? Sign in</Link>}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void checkInvite();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-invite">Invite code</Label>
            <Input
              id="reg-invite"
              value={inviteCode}
              onChange={(e) => {
                setInviteError(null);
                setInviteCode(e.target.value.toUpperCase());
              }}
              placeholder="Issued by an admin"
              invalid={Boolean(inviteError)}
              autoComplete="off"
            />
            {inviteError ? (
              <p role="alert" className="text-[12.5px] text-brand-red">
                {inviteError}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!inviteCode.trim() || checkingInvite}
          >
            {checkingInvite ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
            ) : null}
            Continue
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle={config.site.description || undefined}
      footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Already have an account? Sign in</Link>}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        {error ? (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13px] text-ink"
          >
            {error}
          </div>
        ) : null}
        {inviteVerified ? (
          <div className="flex items-center justify-between rounded border border-brand-green/30 bg-brand-green-50 px-3 py-2">
            <span className="font-mono text-[12px] font-medium text-brand-green-strong">
              Invite code {inviteCode}
            </span>
            <button
              type="button"
              className="text-[12px] font-medium text-ink-2 underline-offset-2 hover:underline"
              onClick={() => setInviteVerified(false)}
            >
              Change
            </button>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-name">Name</Label>
          <Input
            id="reg-name"
            value={name}
            onChange={(e) => {
              clearInvalid();
              setName(e.target.value);
            }}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            invalid={invalid.includes('reg-email')}
            value={email}
            onChange={(e) => {
              clearInvalid();
              setEmail(e.target.value);
            }}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <PasswordInput
            id="reg-password"
            autoComplete="new-password"
            invalid={invalid.includes('reg-password')}
            value={password}
            onChange={(e) => {
              clearInvalid();
              setPassword(e.target.value);
            }}
          />
          <p className="text-[12px] text-ink-3">At least 6 characters</p>
        </div>
        {config.legal.requireConsent ? (
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="reg-consent"
              checked={acceptedTerms}
              onCheckedChange={(next) => setAcceptedTerms(next === true)}
              className="mt-0.5"
            />
            <Label htmlFor="reg-consent" className="text-[13px] font-normal leading-snug text-ink-2">
              I accept the{' '}
              {config.legal.terms ? (
                <Link href={'/legal/terms' as never} className="text-brand-blue hover:underline">
                  terms of service
                </Link>
              ) : (
                'terms of service'
              )}{' '}
              and{' '}
              {config.legal.privacy ? (
                <Link href={'/legal/privacy' as never} className="text-brand-blue hover:underline">
                  privacy policy
                </Link>
              ) : (
                'privacy policy'
              )}
              .
            </Label>
          </div>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            !name ||
            !email ||
            password.length < 6 ||
            (config.registration.inviteRequired && !inviteCode) ||
            (config.legal.requireConsent && !acceptedTerms) ||
            busy
          }
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
