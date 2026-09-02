'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, FileText, LoaderCircle, RotateCcw, Upload } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { OAUTH_PROVIDER_LOGOS } from './oauth-logos';

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
 * number, enum, json) and saves changed items in bulk. Provider
 * settings (email/SMS) only render while their provider is selected;
 * the OAuth group gets a dedicated per-provider panel.
 */
export function SettingsEditor({
  items,
  allItems,
  onDirtyChange,
  onSaved,
}: {
  items: GodmodeSettingItem[];
  /** Every registry item; used to resolve cross-section dependencies
   *  (visibleWhen / disabledWhen can reference keys in other groups). */
  allItems?: GodmodeSettingItem[];
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

  // Provider-conditional fields (email.smtp.*, sms.twilio.*, ...) render
  // only while their provider dropdown points at them. Hidden fields keep
  // their values in state and are still saved if dirty, so switching
  // providers never loses configuration.
  // Dependencies may live in other sections (email.provider gates the
  // magic-link toggle in Sign-in methods), so resolve them against the
  // full registry view rather than just this section's items.
  const lookupItems = useMemo(() => allItems ?? items, [allItems, items]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const rule = item.visibleWhen;
      if (!rule) return true;
      const dep =
        values[rule.key]?.value ?? lookupItems.find((i) => i.key === rule.key)?.value ?? '';
      return rule.oneOf.includes(String(dep));
    });
  }, [items, lookupItems, values]);

  // Options whose prerequisite is not configured yet (magic link without
  // an email provider, etc.) render greyed out with a hint instead of
  // silently failing later.
  const depValue = useCallback(
    (key: string) =>
      values[key]?.value ?? lookupItems.find((i) => i.key === key)?.value ?? '',
    [lookupItems, values],
  );
  const disabledHint = useCallback(
    (item: GodmodeSettingItem): string | null => {
      const rule = item.disabledWhen;
      if (!rule) return null;
      return rule.oneOf.includes(String(depValue(rule.key))) ? rule.hint : null;
    },
    [depValue],
  );

  const isOauthGroup = items.length > 0 && items.every((i) => i.group === 'oauth');

  const hasInvalidJson = visibleItems.some(
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

      {isOauthGroup ? (
        <OAuthProvidersPanel items={items} values={values} onChange={set} />
      ) : (
        visibleItems.map((item) => {
          const entry = values[item.key];
          if (!entry) return null;
          const hint = disabledHint(item);
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
                  {hint ? (
                    <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-brand-yellow-ink">
                      <span aria-hidden>!</span>
                      {hint}
                    </p>
                  ) : null}
                  <p className="mt-1 font-mono text-[11px] text-ink-4">{item.key}</p>
                </div>
                <div className={cn('shrink-0', hint && 'opacity-50')}>
                  <SettingControl
                    item={item}
                    entry={entry}
                    disabled={Boolean(hint)}
                    jsonValid={item.type === 'json' ? isValidJson(String(entry.value)) : true}
                    onChange={(v) => set(item.key, v)}
                  />
                </div>
              </div>
            </div>
          );
        })
      )}

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
  disabled = false,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  /** Whether the current value parses as JSON (only meaningful for json items). */
  jsonValid: boolean;
  /** Grey out the control because its prerequisite is not configured. */
  disabled?: boolean;
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
        disabled={disabled}
        aria-label={item.label}
      />
    );
  }

  if (item.type === 'enum' && item.options) {
    return (
      <Select value={String(entry.value)} onValueChange={(v) => onChange(v)} disabled={disabled}>
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
        disabled={disabled}
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
          disabled={disabled}
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
        disabled={disabled}
        aria-label={item.label}
      />
    );
  }

  return (
    <Input
      className="w-[280px]"
      value={String(entry.value)}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
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

interface ProviderGroup {
  id: string;
  label: string;
  tutorial?: string;
  enabledKey: string;
  fields: GodmodeSettingItem[];
}

/**
 * The OAuth group renders as a list of providers, one card each. The card
 * shows the brand logo and a switch; enabling a provider reveals its
 * configuration fields below it. Disabled providers keep their saved
 * credentials, so re-enabling never asks for them again.
 */
function OAuthProvidersPanel({
  items,
  values,
  onChange,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
}) {
  const providers = useMemo(() => {
    const map = new Map<string, ProviderGroup>();
    for (const item of items) {
      const match = item.key.match(/^auth\.oauth\.([^.]+)\.([^.]+)$/);
      if (!match) continue;
      const [, id, field] = match;
      if (!map.has(id)) {
        map.set(id, { id, label: id, enabledKey: '', fields: [] });
      }
      const group = map.get(id)!;
      if (field === 'enabled') {
        group.enabledKey = item.key;
        group.label = item.label.replace(/\s+sign-in$/i, '');
        group.tutorial = item.description;
      } else {
        group.fields.push(item);
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-3">
        Turn on the providers you want on the login page. Each provider keeps its credentials
        when switched off.
      </p>
      {providers.map((provider) => {
        const enabled = values[provider.enabledKey]?.value === true;
        const Logo = OAUTH_PROVIDER_LOGOS[provider.id];
        const expanded = openOverrides[provider.id] ?? enabled;
        return (
          <div key={provider.id} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                {Logo ? <Logo className="h-5 w-5" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink">{provider.label}</div>
                <div className="font-mono text-[11px] text-ink-4">{provider.enabledKey}</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setOpenOverrides((prev) => ({ ...prev, [provider.id]: !expanded }))
                }
                aria-expanded={expanded}
                aria-label={`Show ${provider.label} configuration`}
                className="inline-grid h-9 w-9 place-items-center rounded text-ink-3 transition-colors duration-120 hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
                  strokeWidth={2.25}
                />
              </button>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  onChange(provider.enabledKey, v);
                  // Reveal the fields when turning on; hide them when turning off.
                  setOpenOverrides((prev) => ({ ...prev, [provider.id]: Boolean(v) }));
                }}
                aria-label={`${provider.label} sign-in`}
              />
            </div>
            {expanded ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 pl-12">
                {provider.tutorial ? (
                  <p className="text-[12.5px] text-ink-3">{provider.tutorial}</p>
                ) : null}
                {provider.fields.length > 0 && !enabled ? (
                  <p className="text-[12px] text-ink-4">
                    Saved credentials stay here while the provider is off.
                  </p>
                ) : null}
                {provider.fields.map((field) => {
                  const entry = values[field.key];
                  if (!entry) return null;
                  return (
                    <div key={field.key} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-ink">{field.label}</span>
                          {field.secret ? (
                            <span className="rounded bg-brand-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-blue">
                              secret
                            </span>
                          ) : null}
                        </div>
                        {field.description ? (
                          <p className="mt-0.5 text-[12px] text-ink-4">{field.description}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <SettingControl
                          item={field}
                          entry={entry}
                          jsonValid
                          onChange={(v) => onChange(field.key, v)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
