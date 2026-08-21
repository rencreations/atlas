'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoadingShell } from '@/components/auth/loading-shell';
import { apiPaths } from '@/lib/api/paths';
import { usePageTitle } from '@/lib/page-title';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** Landing page for email verification links. */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  usePageTitle('Verify your email');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Missing token: never leave a spinner — the link is just incomplete.
    if (!token) {
      setError('This link is missing its token — use the full link from your email.');
      setState('error');
      return;
    }
    if (attempted.current) return;
    attempted.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}${apiPaths.auth.emailVerify()}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message ?? 'The verification link is invalid or expired.');
        }
        setState('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed.');
        setState('error');
      }
    })();
  }, [token]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (state === 'done') {
    return (
      <AuthShell
        title="Email verified"
        subtitle="Your email address is confirmed. You can sign in now."
        footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Go to sign-in</Link>}
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verifying your email…"
      footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
    >
      {state === 'error' ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13.5px] text-ink"
        >
          {error}
          <span className="mt-2 block">
            <Link href="/login" className="font-medium text-brand-blue hover:underline">
              Go to sign-in
            </Link>
          </span>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <LoaderCircle className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
        </div>
      )}
    </AuthShell>
  );
}
