'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPaths } from '@/lib/api/paths';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${apiPaths.auth.passwordForgot()}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? 'Request failed.');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  }, [email]);

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link that lets you choose a new password."
      footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
    >
      {sent ? (
        <div className="rounded border border-brand-blue/30 bg-brand-blue-50 px-4 py-3 text-[13.5px] text-ink">
          If an account exists for <span className="font-medium">{email}</span>, a reset link is
          on its way. It expires in 30 minutes.
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
        >
          {error ? (
            <div className="rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13px] text-ink">
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-email">Email</Label>
            <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={!email || busy} size="lg" className="w-full">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
