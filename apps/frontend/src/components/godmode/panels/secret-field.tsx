'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { CheckIcon } from '@/components/icons/animated/check';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { GodmodeSettingItem } from '@/lib/godmode/types';

/** Secrets that hold certificates or keys get a multi-line editor. */
const LONG_SECRET_PATTERN = /cert|privatekey/i;

/**
 * A secret's value is never sent back to the browser once saved, so this
 * renders a button instead of an input. The popup starts empty: applying
 * it blank is disabled rather than treated as "clear the secret", so
 * opening the dialog to look and closing it again can never wipe a value
 * that was already set.
 */
export function SecretField({
  item,
  disabled = false,
  onChange,
}: {
  item: GodmodeSettingItem;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const isSet = Boolean(item.secretSet);
  const long = LONG_SECRET_PATTERN.test(item.key);

  const openEditor = () => {
    setDraft('');
    setOpen(true);
  };

  // Every close path (Escape, outside click, Cancel, or a successful
  // Apply) funnels through here via onOpenChange, so the draft never
  // lingers for a later open to accidentally show again. Blurring first
  // gives password managers a clean focus-loss signal to dismiss their
  // own autofill overlay instead of leaving it stuck over a field that's
  // about to disappear.
  const closeAndReset = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
    setDraft('');
  };

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim() === '') return;
    onChange(draft);
    closeAndReset();
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openEditor} disabled={disabled}>
        <KeyRound className="h-4 w-4" strokeWidth={2.25} />
        {isSet ? 'Edit' : 'Set'}
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeAndReset())}>
        <DialogContent size={long ? 'lg' : 'sm'}>
          {/* A <form> so Enter in the (single-line) password input submits
              like any other confirm dialog; Enter inside the textarea
              variant still just inserts a newline, browsers never
              auto-submit forms from a <textarea>. */}
          <form onSubmit={apply}>
            <DialogTitle>{item.label}</DialogTitle>
            <DialogDescription>
              {isSet
                ? 'A value is already saved. It can’t be viewed again here, only replaced, leave this blank and close to keep it unchanged.'
                : (item.description ?? 'Stored encrypted and never shown again once saved.')}
            </DialogDescription>
            <div className="mt-4">
              {long ? (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={6}
                  className="font-mono text-[12px]"
                  placeholder={
                    isSet ? 'Leave blank to keep the current value' : 'Paste the value here'
                  }
                  aria-label={`${item.label} value`}
                  autoFocus
                />
              ) : (
                <PasswordInput
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isSet ? 'Leave blank to keep the current value' : 'Not set'}
                  // This holds an API key/webhook secret, not a site
                  // login, but a bare type="password" reads as one to
                  // browsers and extensions, autocomplete="new-password"
                  // especially invites a "save this password?" prompt.
                  // These hints ask password managers to leave it alone.
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  aria-label={`${item.label} value`}
                  autoFocus
                />
              )}
            </div>
            <DialogFooter className="mt-5">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={draft.trim() === ''}>
                <CheckIcon size={16} className="flex items-center justify-center" />
                Apply
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
