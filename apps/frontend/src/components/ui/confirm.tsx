'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmOptions {
  /** Dialog heading. Name the object being acted on. */
  title: string;
  /** What happens, and whether it can be undone. */
  description?: React.ReactNode;
  /** Confirm button label, a verb, not "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive/irreversible actions (the default). */
  tone?: 'danger' | 'primary';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

const ConfirmContext = React.createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(
  null,
);

/**
 * Replaces `window.confirm` for destructive actions. The design system
 * requires confirmations to render through the Dialog primitive so they
 * are themed, focus-trapped, and keyboard-navigable, native dialogs are
 * none of those, and they block the main thread.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete note?' }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...opts, resolve });
      }),
    [],
  );

  const settle = React.useCallback(
    (ok: boolean) => {
      setPending((current) => {
        current?.resolve(ok);
        return null;
      });
    },
    [],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <Dialog open onOpenChange={(open) => !open && settle(false)}>
          <DialogContent size="sm" aria-describedby={pending.description ? undefined : ''}>
            <DialogTitle>{pending.title}</DialogTitle>
            {pending.description ? (
              <DialogDescription>{pending.description}</DialogDescription>
            ) : null}
            <DialogFooter>
              <Button variant="secondary" onClick={() => settle(false)}>
                {pending.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant={pending.tone === 'primary' ? 'primary' : 'danger'}
                autoFocus
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>.');
  }
  return ctx;
}
