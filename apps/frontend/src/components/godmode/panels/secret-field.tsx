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

  const apply = () => {
    if (draft.trim() === '') return;
    onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openEditor} disabled={disabled}>
        <KeyRound className="h-4 w-4" strokeWidth={2.25} />
        {isSet ? 'Edit' : 'Set'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size={long ? 'lg' : 'sm'}>
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
                placeholder={isSet ? 'Leave blank to keep the current value' : 'Paste the value here'}
                aria-label={`${item.label} value`}
                autoFocus
              />
            ) : (
              <PasswordInput
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={isSet ? 'Leave blank to keep the current value' : 'Not set'}
                autoComplete="new-password"
                aria-label={`${item.label} value`}
                autoFocus
              />
            )}
          </div>
          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" onClick={apply} disabled={draft.trim() === ''}>
              <CheckIcon size={16} className="flex items-center justify-center" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
