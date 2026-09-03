'use client';

import { useState } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import { CheckIcon } from '@/components/icons/animated/check';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';

/**
 * Generates a VAPID key pair and saves it immediately (outside the
 * sticky-dirty save flow), so it's live the moment this returns. Both
 * keys are shown once for the admin to copy, the private key can never
 * be viewed again after this dialog closes.
 */
export function GenerateVapidKeysButton({ onGenerated }: { onGenerated?: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    show({ title: 'Copied', description: label, tone: 'success' });
  };

  const generate = async () => {
    setBusy(true);
    try {
      const res = await godmodeFetch<{ publicKey: string; privateKey: string }>(
        godmodePaths.generateVapidKeys(),
        { method: 'POST' },
      );
      setKeys(res);
      onGenerated?.();
    } catch (err) {
      show({
        title: 'Could not generate keys',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => void generate()} loading={busy}>
        <Sparkles className="h-4 w-4" strokeWidth={2.25} />
        Generate VAPID keys
      </Button>

      <Dialog open={keys !== null} onOpenChange={(o) => !o && setKeys(null)}>
        <DialogContent size="lg">
          <DialogTitle>Your new VAPID keys</DialogTitle>
          <DialogDescription>
            Already saved and active, push notifications work with these now. Copy the private
            key somewhere safe, it can’t be shown again after you close this.
          </DialogDescription>
          {keys ? (
            <div className="mt-4 flex flex-col gap-3">
              <KeyRow label="Public key" value={keys.publicKey} onCopy={copy} />
              <KeyRow label="Private key" value={keys.privateKey} onCopy={copy} />
            </div>
          ) : null}
          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <Button size="sm">
                <CheckIcon size={16} className="flex items-center justify-center" />
                Done, I’ve saved it
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KeyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-ink-3">{label}</span>
      <div className="flex items-center gap-2 rounded bg-surface-muted px-3 py-2">
        <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-ink-2">{value}</code>
        <button
          type="button"
          onClick={() => onCopy(value, `${label} copied.`)}
          className="inline-grid h-7 w-7 shrink-0 place-items-center rounded text-ink-3 transition-colors duration-120 hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
