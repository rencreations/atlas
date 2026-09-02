'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodePasskey, GodmodeSettingsView } from '@/lib/godmode/types';

interface TwoFactorStatus {
  totpEnabled: boolean;
  passkeys: GodmodePasskey[];
}

type ConfirmTarget =
  | { kind: 'totp' }
  | { kind: 'passkey'; passkey: GodmodePasskey }
  | null;

export function SecurityPanel() {
  const { show } = useToast();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [totpFlow, setTotpFlow] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<ConfirmTarget>(null);
  const [sessionTtlMinutes, setSessionTtlMinutes] = useState<string | number | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await godmodeFetch<TwoFactorStatus>(godmodePaths.twoFactorStatus()));
    } catch (err) {
      show({ title: 'Load failed', description: String(err), tone: 'danger' });
    }
  }, [show]);

  useEffect(() => {
    void load();
    // The session lifetime is a settings value, not a 2FA value, read it
    // from the settings registry so we can render it read-only.
    godmodeFetch<GodmodeSettingsView>(godmodePaths.settings())
      .then((view) => {
        const item = view.items.find((i) => i.key === 'godmode.sessionTtlMinutes');
        if (item && item.value !== undefined && item.value !== null && item.value !== '') {
          setSessionTtlMinutes(String(item.value));
        }
      })
      .catch(() => undefined);
  }, [load]);

  const beginTotp = useCallback(async () => {
    try {
      const res = await godmodeFetch<{ secret: string; otpauthUrl: string }>(
        godmodePaths.totpSetup(),
        { method: 'POST' },
      );
      setTotpFlow(res);
      setQrDataUrl(await QRCode.toDataURL(res.otpauthUrl, { width: 220, margin: 1 }));
    } catch (err) {
      show({ title: 'Setup failed', description: String(err), tone: 'danger' });
    }
  }, [show]);

  const enableTotp = useCallback(async () => {
    if (!totpFlow) return;
    setBusy(true);
    try {
      await godmodeFetch(godmodePaths.totpEnable(), {
        method: 'POST',
        body: JSON.stringify({ secret: totpFlow.secret, code: totpCode }),
      });
      setTotpFlow(null);
      setTotpCode('');
      show({ title: 'TOTP enabled', description: 'Codes are now required to unlock godmode.', tone: 'success' });
      void load();
    } catch (err) {
      show({
        title: 'Enable failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }, [totpFlow, totpCode, load, show]);

  const disableTotp = useCallback(async () => {
    setBusy(true);
    try {
      await godmodeFetch(godmodePaths.totpDisable(), { method: 'POST' });
      show({ title: 'TOTP disabled', tone: 'success' });
      void load();
    } catch (err) {
      show({ title: 'Disable failed', description: String(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }, [load, show]);

  const registerPasskey = useCallback(async () => {
    setBusy(true);
    try {
      const { challenge, options } = await godmodeFetch<{
        challenge: string;
        options: Record<string, unknown>;
      }>(godmodePaths.passkeyRegisterOptions(), { method: 'POST' });
      const registration = await startRegistration({ optionsJSON: options as never });
      await godmodeFetch(godmodePaths.passkeyRegisterVerify(), {
        method: 'POST',
        body: JSON.stringify({ challenge, response: registration }),
      });
      show({ title: 'Passkey registered', description: 'Use it as the unlock second factor.', tone: 'success' });
      void load();
    } catch (err) {
      show({
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }, [load, show]);

  const deletePasskey = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await godmodeFetch(godmodePaths.passkeyDelete(id), { method: 'DELETE' });
        setConfirming(null);
        show({ title: 'Passkey deleted', tone: 'success' });
        void load();
      } catch (err) {
        show({ title: 'Delete failed', description: String(err), tone: 'danger' });
      } finally {
        setBusy(false);
      }
    },
    [load, show],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded border border-line bg-surface p-4 shadow-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
              <span className="text-[14px] font-medium text-ink">
                TOTP (authenticator app)
              </span>
              {status?.totpEnabled ? <Badge tone="success">enabled</Badge> : null}
            </div>
            <p className="mt-1 text-[13px] text-ink-3">
              Requires a 6-digit code from Google Authenticator, 1Password, or any TOTP app
              after the passphrase.
            </p>
          </div>
          {status?.totpEnabled ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirming({ kind: 'totp' })}
              disabled={busy}
            >
              Disable
            </Button>
          ) : totpFlow ? null : (
            <Button variant="secondary" size="sm" onClick={() => void beginTotp()} disabled={busy}>
              Set up
            </Button>
          )}
        </div>

        {totpFlow ? (
          <div className="mt-4 flex flex-col items-start gap-4 rounded bg-surface-muted p-4 sm:flex-row">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="TOTP QR code" className="rounded bg-surface p-2" />
            ) : null}
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-ink-2">
                Scan the QR code with your authenticator app, or enter the secret manually:
              </p>
              <code className="select-all break-all rounded bg-surface p-2 font-mono text-[12px] text-ink">
                {totpFlow.secret}
              </code>
              <div className="flex items-center gap-2">
                <Input
                  className="w-[140px]"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                />
                <Button size="sm" onClick={() => void enableTotp()} disabled={totpCode.length !== 6 || busy}>
                  {busy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
                  ) : null}
                  Verify & enable
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded border border-line bg-surface p-4 shadow-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
              <span className="text-[14px] font-medium text-ink">Passkeys (WebAuthn)</span>
              {status && (status.passkeys?.length ?? 0) > 0 ? (
                <Badge tone="success">{status.passkeys.length} registered</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-ink-3">
              Hardware security keys (YubiKey, etc.) or platform passkeys (Touch ID, Windows
              Hello). Use one instead of a TOTP code at unlock.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void registerPasskey()} disabled={busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} /> : null}
            Register passkey
          </Button>
        </div>

        {status && (status.passkeys?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {status.passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded bg-surface-muted px-3 py-2"
              >
                <span className="font-mono text-[12px] text-ink-2">
                  {pk.name ?? 'Security key'} · {pk.credentialId.slice(0, 10)}…
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete passkey"
                  onClick={() => setConfirming({ kind: 'passkey', passkey: pk })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-brand-red" strokeWidth={2.25} />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded border border-line bg-surface p-4 shadow-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-ink">
                Godmode session lifetime
              </span>
              <Badge tone="neutral">
                {sessionTtlMinutes !== null ? `${sessionTtlMinutes} min` : 'managed'}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-ink-3">
              Configure in Settings → Godmode security (godmode.sessionTtlMinutes).
            </p>
          </div>
        </div>
      </div>

      <Dialog
        open={confirming !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setConfirming(null);
        }}
      >
        <DialogContent size="sm">
          {confirming?.kind === 'totp' ? (
            <>
              <DialogTitle>Disable TOTP?</DialogTitle>
              <DialogDescription>
                Unlock will no longer require a 6-digit authenticator code. Anyone with the
                passphrase can unlock godmode without a second factor.
              </DialogDescription>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirming(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button variant="danger" loading={busy} onClick={() => void disableTotp()}>
                  Disable TOTP
                </Button>
              </DialogFooter>
            </>
          ) : confirming?.kind === 'passkey' ? (
            <>
              <DialogTitle>Delete this passkey?</DialogTitle>
              <DialogDescription>
                “{confirming.passkey.name ?? 'Security key'}” (
                {confirming.passkey.credentialId.slice(0, 10)}…) can no longer be used as a
                second factor. This cannot be undone.
              </DialogDescription>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirming(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={busy}
                  onClick={() => void deletePasskey(confirming.passkey.id)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                  Delete passkey
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
