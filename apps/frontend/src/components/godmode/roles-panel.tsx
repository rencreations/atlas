'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, Plus, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodePermission, GodmodeRole } from '@/lib/godmode/types';

export function RolesPanel() {
  const { show } = useToast();
  const [roles, setRoles] = useState<GodmodeRole[]>([]);
  const [permissions, setPermissions] = useState<GodmodePermission[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingBusy, setCreatingBusy] = useState(false);

  // Local editor state for the selected role.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<{
    name: string;
    description: string;
    permissions: string[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        godmodeFetch<GodmodeRole[]>(godmodePaths.roles()),
        godmodeFetch<GodmodePermission[]>(godmodePaths.permissions()),
      ]);
      setRoles(r);
      setPermissions(p);
    } catch (err) {
      show({ title: 'Load failed', description: String(err), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const role = roles.find((r) => r.code === selectedCode);
    if (role) {
      setName(role.name);
      setDescription(role.description ?? '');
      setChecked(new Set(role.permissions));
      setBaseline({
        name: role.name,
        description: role.description ?? '',
        permissions: [...role.permissions].sort(),
      });
    }
  }, [roles, selectedCode]);

  const dirty =
    baseline !== null &&
    (name !== baseline.name ||
      description !== baseline.description ||
      checked.size !== baseline.permissions.length ||
      baseline.permissions.some((p) => !checked.has(p)));

  const categories = useMemo(() => {
    const map = new Map<string, GodmodePermission[]>();
    for (const p of permissions) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [permissions]);

  const save = useCallback(async () => {
    if (!selectedCode) return;
    setSaving(true);
    try {
      await godmodeFetch(godmodePaths.roles(), {
        method: 'PUT',
        body: JSON.stringify({
          code: selectedCode,
          name,
          description,
          permissions: [...checked],
        }),
      });
      show({ title: 'Role saved', description: selectedCode, tone: 'success' });
      void load();
    } catch (err) {
      show({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }, [selectedCode, name, description, checked, load, show]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoaderCircle className="h-6 w-6 animate-spin text-ink-3" strokeWidth={2.25} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[280px_1fr]">
      {/* Sticky and independently scrollable: the permission editor on the
          right can run much longer than one screen, and the role list is
          the thing you need to keep glancing at (which role am I editing?)
          while scrolling through it, so it stays put instead of scrolling
          away with the page. */}
      <div className="flex flex-col gap-2 md:sticky md:top-10 md:max-h-[calc(100svh-5rem)] md:overflow-y-auto md:pb-2">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          New role
        </Button>
        {roles.length === 0 ? (
          <div className="rounded border border-line bg-surface p-8 text-center text-[14px] text-ink-3 shadow-1">
            No roles yet.
          </div>
        ) : null}
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedCode(role.code)}
            className={`rounded border bg-surface p-3 text-left shadow-1 transition-[border-color] duration-120 ${
              selectedCode === role.code ? 'border-brand-blue' : 'border-line hover:border-line-strong'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-medium text-ink">{role.name}</span>
              {role.isSystem ? (
                <Badge tone="neutral">template</Badge>
              ) : (
                <Badge tone="outline">custom</Badge>
              )}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-ink-4">{role.code}</div>
            <div className="mt-1 text-[12px] text-ink-3">{role.description}</div>
          </button>
        ))}
      </div>

      {selectedCode ? (
        // Same top/middle/bottom split as the sidebar: the name+description
        // header and the Save button stay put, only the permission list
        // (which can run to dozens of checkboxes) scrolls in between.
        <div className="flex flex-col gap-4 md:sticky md:top-10 md:max-h-[calc(100svh-5rem)]">
          <div className="flex shrink-0 flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
              <h3 className="font-display text-h4 text-ink">Editing {selectedCode}</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-caption text-ink-3">Role name</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-caption text-ink-3">Description</span>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-1 pr-1">
            {categories.map(([category, perms]) => (
              <div
                key={category}
                className="rounded border border-line bg-surface p-4 shadow-1"
              >
                <div className="text-eyebrow uppercase text-ink-4">{category}</div>
                <div className="mt-3 flex flex-col gap-2">
                  {perms.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-3 text-[14px] text-ink"
                    >
                      <Checkbox
                        checked={checked.has(p.code)}
                        onCheckedChange={(v) => {
                          const next = new Set(checked);
                          if (v === true) next.add(p.code);
                          else next.delete(p.code);
                          setChecked(next);
                        }}
                      />
                      <span className="min-w-0">
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 font-mono text-[11px] text-ink-4">{p.code}</span>
                        {p.description ? (
                          <span className="block text-[12px] text-ink-3">{p.description}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line pt-4">
            <Button size="sm" onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.25} />
              )}
              Save role
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded border border-line bg-surface p-8 text-center text-[14px] text-ink-3 shadow-1">
          Select a role to edit its permissions, or create a new one.
        </div>
      )}

      {creating ? (
        <CreateRoleDialog
          permissions={permissions}
          busy={creatingBusy}
          onClose={() => setCreating(false)}
          onCreate={async (data) => {
            setCreatingBusy(true);
            try {
              const res = await godmodeFetch<{ code: string }>(godmodePaths.roles(), {
                method: 'POST',
                body: JSON.stringify(data),
              });
              setCreating(false);
              show({ title: 'Role created', description: data.name, tone: 'success' });
              await load();
              setSelectedCode(res.code);
            } catch (err) {
              show({
                title: 'Create failed',
                description: err instanceof Error ? err.message : 'Unknown error.',
                tone: 'danger',
              });
            } finally {
              setCreatingBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CreateRoleDialog({
  permissions,
  busy,
  onClose,
  onCreate,
}: {
  permissions: GodmodePermission[];
  busy: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string; permissions: string[] }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const map = new Map<string, GodmodePermission[]>();
    for (const p of permissions) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [permissions]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogTitle>Create a custom role</DialogTitle>
        <DialogDescription>
          Pick a name and the permissions this role grants. The role code is derived from the
          name and can be granted from Users &amp; invites.
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cr-name">Role name</Label>
            <Input
              id="cr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Support moderator"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cr-desc">Description</Label>
            <Textarea
              id="cr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What this role is for."
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {categories.map(([category, perms]) => (
            <div key={category} className="rounded border border-line bg-surface p-4 shadow-1">
              <div className="text-eyebrow uppercase text-ink-4">{category}</div>
              <div className="mt-3 flex flex-col gap-2">
                {perms.map((p) => (
                  <label key={p.id} className="flex items-start gap-3 text-[14px] text-ink">
                    <Checkbox
                      checked={checked.has(p.code)}
                      onCheckedChange={(v) => {
                        const next = new Set(checked);
                        if (v === true) next.add(p.code);
                        else next.delete(p.code);
                        setChecked(next);
                      }}
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 font-mono text-[11px] text-ink-4">{p.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || busy} onClick={() => onCreate({
            name: name.trim(),
            description: description.trim() || undefined,
            permissions: [...checked],
          })}>
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
            ) : (
              <Check className="h-4 w-4" strokeWidth={2.25} />
            )}
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
