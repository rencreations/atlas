'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { PasswordInput } from '@/components/auth/password-input';
import { CheckIcon } from '@/components/icons/animated/check';
import { PlusIcon } from '@/components/icons/animated/plus';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodePassphraseCredential, GodmodeRole } from '@/lib/godmode/types';

interface Draft {
  name: string;
  roleCode: string;
  passphrase: string;
}

function emptyDraft(defaultRole: string): Draft {
  return { name: '', roleCode: defaultRole, passphrase: '' };
}

/**
 * Named instance-passphrase credentials: an admin can add as many shared
 * sign-in phrases as they want, each with its own role and its own user
 * identity, instead of everyone who knows "the" passphrase sharing one
 * account and one permission set.
 */
export function PassphraseCredentialsPanel({
  credentials,
  onChanged,
}: {
  credentials: GodmodePassphraseCredential[];
  onChanged?: () => void;
}) {
  const { show } = useToast();
  const confirm = useConfirm();
  const [roles, setRoles] = useState<GodmodeRole[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GodmodePassphraseCredential | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft('member'));
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    godmodeFetch<GodmodeRole[]>(godmodePaths.roles())
      .then(setRoles)
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft(roles[0]?.code ?? 'member'));
    setDialogOpen(true);
  };

  const openEdit = (c: GodmodePassphraseCredential) => {
    setEditing(c);
    setDraft({ name: c.name, roleCode: c.roleCode, passphrase: '' });
    setDialogOpen(true);
  };

  // Any close path (Cancel, Escape, outside click, or a successful save)
  // resets the draft, so a half-typed passphrase never reappears the next
  // time this dialog opens.
  const closeDialog = () => {
    setDialogOpen(false);
    setDraft(emptyDraft('member'));
  };

  const submit = async () => {
    if (!draft.name.trim() || (!editing && !draft.passphrase.trim())) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        roleCode: draft.roleCode,
        enabled: editing?.enabled ?? true,
        ...(draft.passphrase.trim() ? { passphrase: draft.passphrase.trim() } : {}),
      };
      if (editing) {
        await godmodeFetch(godmodePaths.passphraseCredential(editing.id), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        show({ title: 'Saved', description: `${draft.name.trim()} updated.`, tone: 'success' });
      } else {
        await godmodeFetch(godmodePaths.passphraseCredentials(), {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        show({
          title: 'Added',
          description: `${draft.name.trim()} can sign in now.`,
          tone: 'success',
        });
      }
      closeDialog();
      onChanged?.();
    } catch (err) {
      show({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: GodmodePassphraseCredential, enabled: boolean) => {
    setBusyId(c.id);
    try {
      await godmodeFetch(godmodePaths.passphraseCredentialEnabled(c.id), {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      onChanged?.();
    } catch (err) {
      show({
        title: 'Could not update',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: GodmodePassphraseCredential) => {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      description:
        'Anyone signing in with this passphrase loses that access immediately. Accounts already created through it stay intact.',
      confirmLabel: 'Delete passphrase',
    });
    if (!ok) return;
    try {
      await godmodeFetch(godmodePaths.passphraseCredential(c.id), { method: 'DELETE' });
      show({ title: 'Deleted', description: `${c.name} removed.`, tone: 'success' });
      onChanged?.();
    } catch (err) {
      show({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[440px] text-[12px] text-ink-4">
          Each passphrase is independent, its own role and its own account, good for a kiosk, a
          demo booth, or a team that doesn&apos;t need individual logins.
        </p>
        <Button type="button" size="sm" variant="secondary" onClick={openCreate}>
          <PlusIcon size={16} className="flex items-center justify-center" />
          Add passphrase
        </Button>
      </div>

      {credentials.length === 0 ? (
        <p className="text-[12px] text-ink-4">No passphrases yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {credentials.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded border border-line bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink">{c.name}</div>
                <div className="text-[11px] text-ink-4">
                  Role: {roles.find((r) => r.code === c.roleCode)?.name ?? c.roleCode}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(c)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void remove(c)}
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-brand-red" strokeWidth={2.25} />
              </Button>
              <Switch
                checked={c.enabled}
                onCheckedChange={(v) => void toggle(c, v)}
                disabled={busyId === c.id}
                aria-label={`${c.name} enabled`}
              />
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent size="sm">
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a passphrase'}</DialogTitle>
          <DialogDescription>
            Anyone who knows this phrase signs in with the role you pick below.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink">Name</span>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Front desk kiosk"
                  aria-label="Passphrase name"
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink">Passphrase</span>
                <PasswordInput
                  value={draft.passphrase}
                  onChange={(e) => setDraft((d) => ({ ...d, passphrase: e.target.value }))}
                  placeholder={
                    editing ? 'Leave blank to keep the current passphrase' : 'A shared sign-in phrase'
                  }
                  // A shared sign-in phrase, not the admin's own account
                  // password, autocomplete="new-password" would invite a
                  // "save this password?" prompt for the wrong account.
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  aria-label="Passphrase value"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink">Role</span>
                <Select
                  value={draft.roleCode}
                  onValueChange={(v) => setDraft((d) => ({ ...d, roleCode: v }))}
                >
                  <SelectTrigger aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.code}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <DialogFooter className="mt-5">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !draft.name.trim() || (!editing && !draft.passphrase.trim())}
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
                ) : (
                  <CheckIcon size={16} className="flex items-center justify-center" />
                )}
                {editing ? 'Save' : 'Add passphrase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
