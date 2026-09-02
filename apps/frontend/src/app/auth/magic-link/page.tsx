'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoadingShell } from '@/components/auth/loading-shell';
import { apiPaths } from '@/lib/api/paths';
import { storeSession } from '@/lib/auth-client';
import { sanitizeReturnTo } from '@/lib/auth-redirect';
import { usePageTitle } from '@/lib/page-title';
import { MAGIC_CALLBACK_KEY } from '@/components/auth/login-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** Landing page for emailed magic links. Verifies the token and signs in. */
export default function MagicLinkPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <MagicLinkContent />
    </Suspense>
  );
}

function MagicLinkContent() {
  usePageTitle('Sign in');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Missing token: never leave a spinner, the link is just incomplete.
    if (!token) {
      setError('This link is missing its token, use the full link from your email.');
      return;
    }
    if (attempted.current) return;
    attempted.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}${apiPaths.auth.magicLinkVerify()}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message ?? 'The sign-in link is invalid or expired.');
        }
        storeSession({
          sessionId: data.sessionId,
          expiresAt: new Date(data.expiresAt),
          user: data.user as never,
        });
        // Return to wherever the user was before requesting the link
        // (stashed by the login page), sanitized against open redirects.
        const stashed = sessionStorage.getItem(MAGIC_CALLBACK_KEY);
        sessionStorage.removeItem(MAGIC_CALLBACK_KEY);
        const target = sanitizeReturnTo(stashed) ?? '/dashboard';
        router.push(target as never);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    })();
  }, [token, router]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  return (
    <AuthShell
      title="Signing you in…"
      footer={<Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
    >
      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13.5px] text-ink"
        >
          {error}
          <span className="mt-2 block">
            <Link href="/login" className="-my-2 inline-block py-2 font-medium text-brand-blue hover:underline">
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
