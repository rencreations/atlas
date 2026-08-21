'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { apiPaths } from '@/lib/api/paths';
import { storeSession } from '@/lib/auth-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** Landing page for emailed magic links. Verifies the token and signs in. */
export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !token) return;
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
        router.push('/dashboard' as never);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    })();
  }, [token, router]);

  return (
    <AuthShell
      title="Signing you in…"
      footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
    >
      {error ? (
        <div className="rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13.5px] text-ink">
          {error}
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <LoaderCircle className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
        </div>
      )}
    </AuthShell>
  );
}
