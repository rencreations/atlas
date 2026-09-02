'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileText, LoaderCircle, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// Long-form documents get a dedicated editor instead of a one-line input.
const LEGAL_DOC_KEYS = new Set(['legal.termsText', 'legal.privacyText']);

/**
 * Generic settings renderer driven by the godmode settings registry.
 * Renders every registry item type (boolean switch, text, secret,
 * number, enum, json) and saves changed items in bulk.
 */
export function SettingsEditor({
  items,
  onDirtyChange,
  onSaved,
}: {
  items: GodmodeSettingItem[];
  /** Fired when the set of unsaved edits becomes non-empty / empty. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Fired after settings were saved successfully (lets the host refresh). */
  onSaved?: () => void;
}) {
  const { show } = useToast();
  const [values, setValues] = useState<Record<string, EditorValue>>({});
  const [saving, setSaving] = useState(false);

  // Re-initialize only when the settings content actually changes. The host
  // hands us a new `items` array identity on every render, so keying this
  // effect on `items` directly wiped all edits on each keystroke (the value
  // snapped back and the Save button flashed). Compare the serialized
  // content instead so identical data never resets the form.
  const itemsSignature = useMemo(() => JSON.stringify(items), [items]);
  useEffect(() => {
    const next: Record<string, EditorValue> = {};
    for (const item of items) next[item.key] = initialEditorValue(item);
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSignature]);

  const dirtyCount = Object.values(values).filter((v) => v.dirty).length;
  useEffect(() => {
    onDirtyChange?.(dirtyCount > 0);
  }, [dirtyCount, onDirtyChange]);

  const set = useCallback((key: string, value: EditorValue['value']) => {
    setValues((prev) => ({ ...prev, [key]: { value, dirty: true } }));
  }, []);

  function isValidJson(raw: string): boolean {
    if (raw.trim() === '') return true;
    try {
      JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  const hasInvalidJson = items.some(
    (i) => i.type === 'json' && !isValidJson(String(values[i.key]?.value ?? '')),
  );

  const save = useCallback(async () => {
    const itemByKey = new Map(items.map((i) => [i.key, i]));
    const changed = Object.entries(values)
      .filter(([, v]) => v.dirty)
      // An emptied number field stays '' until a value is typed, skip it
      // rather than sending 0 or an empty string to a numeric setting.
      .filter(([key, v]) => {
        const item = itemByKey.get(key);
        return !(item?.type === 'number' && v.value === '');
      })
      .map(([key, v]) => ({ key, value: v.value }));
    if (changed.length === 0) return;
    const invalidJson = changed.some(
      (c) => (itemByKey.get(c.key)?.type ?? '') === 'json' && !isValidJson(String(c.value)),
    );
    if (invalidJson) {
      show({
        title: 'Invalid JSON',
        description: 'Fix the highlighted JSON fields before saving.',
        tone: 'danger',
      });
      return;
    }
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
      // The host still holds the pre-save settings snapshot; have it refetch
      // so switching panels (which re-initializes the editor) shows server truth.
      onSaved?.();
    } catch (err) {
      show({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }, [values, items, show, onSaved]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-9 items-center justify-end">
        {dirtyCount > 0 ? (
          <Button size="sm" onClick={() => void save()} disabled={saving || hasInvalidJson}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
            ) : (
              <Check className="h-4 w-4" strokeWidth={2.25} />
            )}
            Save {dirtyCount} change{dirtyCount === 1 ? '' : 's'}
          </Button>
        ) : null}
      </div>

      {items.map((item) => {
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
                <SettingControl
                  item={item}
                  entry={entry}
                  jsonValid={item.type === 'json' ? isValidJson(String(entry.value)) : true}
                  onChange={(v) => set(item.key, v)}
                />
              </div>
            </div>
          </div>
        );
      })}

      {items.length === 0 ? (
        <div className="rounded border border-line bg-surface p-8 text-center text-[14px] text-ink-3 shadow-1">
          No settings in this group.
        </div>
      ) : null}

      {dirtyCount > 0 ? (
        <div className="sticky bottom-4 flex items-center justify-end gap-2">
          {hasInvalidJson ? (
            <span className="mr-auto text-[12px] text-brand-red">
              Some JSON fields don&apos;t parse, fix them before saving.
            </span>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => {
            const next: Record<string, EditorValue> = {};
            for (const item of items) next[item.key] = initialEditorValue(item);
            setValues(next);
          }}>
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            Discard
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || hasInvalidJson}>
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
  jsonValid,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  /** Whether the current value parses as JSON (only meaningful for json items). */
  jsonValid: boolean;
  onChange: (value: EditorValue['value']) => void;
}) {
  if (LEGAL_DOC_KEYS.has(item.key)) {
    return <LegalDocControl item={item} entry={entry} onChange={onChange} />;
  }

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
        <SelectTrigger className="w-[220px]" aria-label={item.label}>
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
        aria-label={item.label}
        // Keep '' while the field is empty instead of coercing to 0;
        // emptied numbers are skipped at save time.
        value={String(entry.value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    );
  }

  if (item.type === 'json') {
    return (
      <div className="flex w-[280px] flex-col gap-1">
        <Textarea
          className="w-full font-mono text-[12px]"
          rows={4}
          aria-label={item.label}
          invalid={!jsonValid}
          value={String(entry.value)}
          onChange={(e) => onChange(e.target.value)}
        />
        {!jsonValid ? (
          <span className="text-[12px] text-brand-red">Invalid JSON, fix before saving.</span>
        ) : null}
      </div>
    );
  }

  if (item.secret) {
    return (
      <Input
        type="password"
        className="w-[280px]"
        value={String(entry.value)}
        placeholder={item.secretSet ? '•••••••• (set, leave blank to keep)' : 'Not set'}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        aria-label={item.label}
      />
    );
  }

  return (
    <Input
      className="w-[280px]"
      value={String(entry.value)}
      onChange={(e) => onChange(e.target.value)}
      aria-label={item.label}
    />
  );
}

/**
 * Long-form Markdown documents (terms, privacy) get a Configure button
 * instead of a cramped one-line input. The dialog offers a large editor
 * and a Markdown file upload; Apply stages the text into the form, where
 * it joins the other pending changes until Save is pressed.
 */
function LegalDocControl({
  item,
  entry,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  onChange: (value: EditorValue['value']) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const value = String(entry.value);

  const openEditor = () => {
    setDraft(value);
    setOpen(true);
  };

  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" size="sm" onClick={openEditor}>
          <FileText className="h-4 w-4" strokeWidth={2.25} />
          Configure
        </Button>
        <span className="text-[11px] text-ink-4">
          {value ? `${value.length.toLocaleString()} characters` : 'Not set'}
        </span>
      </div>
      {value ? (
        <p className="line-clamp-2 text-[11px] leading-4 text-ink-4">
          {value.replace(/\s+/g, ' ').trim().slice(0, 160)}
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="w-[calc(100%-2rem)]">
          <DialogTitle>{item.label}</DialogTitle>
          <DialogDescription>
            {item.description} Paste the document below, or upload a Markdown file.
          </DialogDescription>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            className="mt-5 min-h-[340px] w-full font-normal text-[13px]"
            aria-label={`${item.label} markdown`}
            placeholder={'# ' + item.label + '\n\nWrite the document in Markdown.'}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void file
                  .text()
                  .then(setDraft)
                  .catch(() => undefined);
              }
              e.target.value = '';
            }}
          />
          <DialogFooter className="mt-5">
            <Button
              variant="secondary"
              size="sm"
              className="mr-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" strokeWidth={2.25} />
              Upload .md file
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              <Check className="h-4 w-4" strokeWidth={2.25} />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
