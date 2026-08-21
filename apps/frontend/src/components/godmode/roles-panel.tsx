'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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

  // Local editor state for the selected role.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

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
    }
  }, [roles, selectedCode]);

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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedCode(role.code)}
            className={`rounded border bg-white p-3 text-left shadow-1 transition-[border-color] duration-120 ${
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
        <div className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-4">
            {categories.map(([category, perms]) => (
              <div
                key={category}
                className="rounded border border-line bg-white p-4 shadow-1"
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

          <div className="flex items-center justify-end gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving}>
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
        <div className="rounded border border-line bg-white p-8 text-center text-[14px] text-ink-3 shadow-1">
          Select a role to edit its permissions.
        </div>
      )}
    </div>
  );
}
