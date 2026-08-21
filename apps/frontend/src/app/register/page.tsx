'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPaths } from '@/lib/api/paths';
import type { PublicConfig } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function RegisterPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}${apiPaths.publicConfig()}`)
      .then((r) => r.json() as Promise<PublicConfig>)
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${apiPaths.auth.register()}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode: inviteCode || undefined }),
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
      setBusy(false);
    }
  }, [name, email, password, inviteCode, router]);

  if (!config) {
    return (
      <AuthShell title="Create an account">
        <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
      </AuthShell>
    );
  }

  if (!config.registration.enabled) {
    return (
      <AuthShell
        title="Registration is closed"
        subtitle="This instance does not allow self-registration. Ask an admin for an invite or an account."
        footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Back to sign-in</Link>}
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle={config.site.description || undefined}
      footer={<Link href="/login" className="font-medium text-brand-blue hover:underline">Already have an account? Sign in</Link>}
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
          <Label htmlFor="reg-name">Name</Label>
          <Input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-email">Email</Label>
          <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {config.registration.inviteRequired ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-invite">Invite code</Label>
            <Input
              id="reg-invite"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Issued by an admin"
            />
          </div>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!name || !email || password.length < 6 || (config.registration.inviteRequired && !inviteCode) || busy}
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
