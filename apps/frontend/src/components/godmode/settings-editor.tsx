'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodeSettingItem } from '@/lib/godmode/types';

interface EditorValue {
  value: string | boolean | number;
  dirty: boolean;
}

function initialEditorValue(item: GodmodeSettingItem): EditorValue {
  if (item.type === 'boolean') {
    return { value: item.value === true, dirty: false };
  }
  return { value: String(item.value ?? item.defaultValue ?? ''), dirty: false };
}

/**
 * Generic settings renderer driven by the godmode settings registry.
 * Renders every registry item type (boolean switch, text, secret,
 * number, enum, json) and saves changed items in bulk.
 */
export function SettingsEditor({ items }: { items: GodmodeSettingItem[] }) {
  const { show } = useToast();
  const [values, setValues] = useState<Record<string, EditorValue>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, EditorValue> = {};
    for (const item of items) next[item.key] = initialEditorValue(item);
    setValues(next);
  }, [items]);

  const visible = useMemo(
    () => items.filter((i) => showAdvanced || !i.advanced),
    [items, showAdvanced],
  );

  const set = useCallback((key: string, value: EditorValue['value']) => {
    setValues((prev) => ({ ...prev, [key]: { value, dirty: true } }));
  }, []);

  const save = useCallback(async () => {
    const changed = Object.entries(values)
      .filter(([, v]) => v.dirty)
      .map(([key, v]) => ({ key, value: v.value }));
    if (changed.length === 0) return;
    setSaving(true);
    try {
      await godmodeFetch(godmodePaths.settingsBulk(), {
        method: 'PUT',
        body: JSON.stringify({ settings: changed }),
      });
      setValues((prev) => {
        const next = { ...prev };
        for (const c of changed) next[c.key] = { ...next[c.key], dirty: false };
        return next;
      });
      show({ title: 'Saved', description: `${changed.length} setting(s) updated.`, tone: 'success' });
    } catch (err) {
      show({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }, [values, show]);

  const dirtyCount = Object.values(values).filter((v) => v.dirty).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-caption text-ink-3">
          <Switch
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
            aria-label="Show advanced settings"
          />
          Show advanced settings
        </label>
        {dirtyCount > 0 ? (
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
            ) : (
              <Check className="h-4 w-4" strokeWidth={2.25} />
            )}
            Save {dirtyCount} change{dirtyCount === 1 ? '' : 's'}
          </Button>
        ) : null}
      </div>

      {visible.map((item) => {
        const entry = values[item.key];
        if (!entry) return null;
        return (
          <div
            key={item.key}
            className="rounded border border-line bg-surface p-4 shadow-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ink">{item.label}</span>
                  {item.secret ? (
                    <span className="rounded bg-brand-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-blue">
                      secret
                    </span>
                  ) : null}
                  {item.advanced ? (
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                      advanced
                    </span>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="mt-1 text-[13px] text-ink-3">{item.description}</p>
                ) : null}
                <p className="mt-1 font-mono text-[11px] text-ink-4">{item.key}</p>
              </div>
              <div className="shrink-0">
                <SettingControl item={item} entry={entry} onChange={(v) => set(item.key, v)} />
              </div>
            </div>
          </div>
        );
      })}

      {visible.length === 0 ? (
        <div className="rounded border border-line bg-surface p-8 text-center text-[14px] text-ink-3 shadow-1">
          No settings in this group.
        </div>
      ) : null}

      {dirtyCount > 0 ? (
        <div className="sticky bottom-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => {
            const next: Record<string, EditorValue> = {};
            for (const item of items) next[item.key] = initialEditorValue(item);
            setValues(next);
          }}>
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            Discard
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
            ) : (
              <Check className="h-4 w-4" strokeWidth={2.25} />
            )}
            Save changes
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SettingControl({
  item,
  entry,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  onChange: (value: EditorValue['value']) => void;
}) {
  if (item.type === 'boolean') {
    return (
      <Switch
        checked={entry.value === true}
        onCheckedChange={(v) => onChange(v)}
        aria-label={item.label}
      />
    );
  }

  if (item.type === 'enum' && item.options) {
    return (
      <Select value={String(entry.value)} onValueChange={(v) => onChange(v)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {item.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (item.type === 'number') {
    return (
      <Input
        type="number"
        className="w-[160px]"
        value={String(entry.value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  if (item.type === 'json') {
    return (
      <Textarea
        className="w-[280px] font-mono text-[12px]"
        rows={4}
        value={String(entry.value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (item.secret) {
    return (
      <Input
        type="password"
        className="w-[280px]"
        value={String(entry.value)}
        placeholder={item.secretSet ? '•••••••• (set — leave blank to keep)' : 'Not set'}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
      />
    );
  }

  return (
    <Input
      className="w-[280px]"
      value={String(entry.value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
