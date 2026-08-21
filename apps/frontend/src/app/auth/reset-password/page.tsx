'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPaths } from '@/lib/api/paths';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Sign in with your new password."
        footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Go to sign-in</Link>}
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="This link expires in 30 minutes."
      footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
    >
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
          <Label htmlFor="rp-password">New password</Label>
          <Input
            id="rp-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!token || password.length < 6 || busy} size="lg" className="w-full">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
