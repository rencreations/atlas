'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BadgeCheck, LoaderCircle, Mail, Smartphone } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

interface MeAccount {
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
}

export default function AccountSettingsPage() {
  const { show } = useToast();
  const { data: me } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<MeAccount>(apiPaths.me()),
  });

  // ─── Password change ───
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const changePassword = useMutation({
    mutationFn: () =>
      api(apiPaths.auth.passwordChange(), {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      show({ title: 'Password updated', tone: 'success' });
    },
    onError: (err) =>
      show({
        title: 'Change failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      }),
  });

  // ─── Email verification ───
  const resendVerification = useMutation({
    mutationFn: () => api(apiPaths.auth.emailVerifyResend(), { method: 'POST' }),
    onSuccess: () => show({ title: 'Verification email sent', tone: 'success' }),
    onError: (err) =>
      show({
        title: 'Could not send',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      }),
  });

  // ─── Phone linking ───
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const requestCode = useMutation({
    mutationFn: () =>
      api(apiPaths.auth.phoneVerifyRequest(), {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    onSuccess: () => {
      setCodeSent(true);
      show({ title: 'Code sent', description: 'Check your phone.', tone: 'success' });
    },
    onError: (err) =>
      show({
        title: 'Request failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      }),
  });
  const confirmCode = useMutation({
    mutationFn: () =>
      api(apiPaths.auth.phoneVerifyConfirm(), {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),
    onSuccess: () => {
      setCodeSent(false);
      setCode('');
      show({ title: 'Phone verified and linked', tone: 'success' });
    },
    onError: (err) =>
      show({
        title: 'Verification failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      }),
  });

  if (!me) {
    return (
      <div className="flex justify-center py-12">
        <LoaderCircle className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
      </div>
    );
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <Card>
        <CardBody>
          <CardTitle>Email</CardTitle>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
              <span className="text-[14px] text-ink">{me.email}</span>
              {me.emailVerified ? (
                <Badge tone="success">verified</Badge>
              ) : (
                <Badge tone="warning">unverified</Badge>
              )}
            </div>
            {!me.emailVerified ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => resendVerification.mutate()}
                disabled={resendVerification.isPending}
              >
                Resend link
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Phone number</CardTitle>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
              <span className="text-[14px] text-ink">{me.phone ?? 'No phone linked'}</span>
              {me.phoneVerified ? <Badge tone="success">verified</Badge> : null}
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="w-[220px]"
                placeholder="+15551234567"
                value={phone}
                disabled={codeSent}
                onChange={(e) => setPhone(e.target.value)}
              />
              {!codeSent ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => requestCode.mutate()}
                  disabled={!phone || requestCode.isPending}
                >
                  Send code
                </Button>
              ) : (
                <>
                  <Input
                    className="w-[110px]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <Button
                    size="sm"
                    onClick={() => confirmCode.mutate()}
                    disabled={code.length < 4 || confirmCode.isPending}
                  >
                    Verify
                  </Button>
                </>
              )}
            </div>
            <p className="text-[12.5px] text-ink-3">
              A verified phone enables phone OTP sign-in (if the admin has enabled it).
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Password</CardTitle>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ac-current">Current password</Label>
              <Input
                id="ac-current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ac-next">New password</Label>
              <Input
                id="ac-next"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => changePassword.mutate()}
                disabled={!current || next.length < 6 || changePassword.isPending}
              >
                {changePassword.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
                ) : (
                  <BadgeCheck className="h-4 w-4" strokeWidth={2.25} />
                )}
                Change password
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
