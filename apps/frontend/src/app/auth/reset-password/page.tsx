'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoadingShell } from '@/components/auth/loading-shell';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/auth/password-input';
import { apiPaths } from '@/lib/api/paths';
import { usePageTitle } from '@/lib/page-title';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  usePageTitle('Reset password');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${apiPaths.auth.passwordReset()}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? 'Reset failed.'),
        );
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
      setBusy(false);
    }
  }, [token, password]);

  if (!token) {
    return (
      <AuthShell
        title="Reset your password"
        footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
      >
        <ErrorState
          title="This link is missing its token"
          message="Use the full link from your email, the one that contains the token. If it still doesn't work, request a new reset link from the sign-in page."
        />
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Sign in with your new password."
        footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Go to sign-in</Link>}
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="This link expires in 30 minutes."
      footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-password">New password</Label>
          <PasswordInput
            id="rp-password"
            autoComplete="new-password"
            invalid={Boolean(error)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-[12px] text-ink-3">At least 6 characters</p>
        </div>
        <Button type="submit" disabled={password.length < 6 || busy} size="lg" className="w-full">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
