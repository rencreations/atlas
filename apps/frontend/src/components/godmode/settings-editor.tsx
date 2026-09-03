'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Copy,
  FileText,
  Fingerprint,
  HelpCircle,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { ArrowRightIcon } from '@/components/icons/animated/arrow-right';
import { BoxIcon } from '@/components/icons/animated/box';
import { CheckIcon } from '@/components/icons/animated/check';
import { ChevronDownIcon } from '@/components/icons/animated/chevron-down';
import { CloudIcon } from '@/components/icons/animated/cloud';
import { CloudCogIcon } from '@/components/icons/animated/cloud-cog';
import { ExternalLinkIcon } from '@/components/icons/animated/external-link';
import { HardDriveIcon } from '@/components/icons/animated/hard-drive';
import { KeyIcon } from '@/components/icons/animated/key-round';
import { MailIcon } from '@/components/icons/animated/mail';
import { PhoneIcon } from '@/components/icons/animated/phone';
import { PlusIcon } from '@/components/icons/animated/plus';
import { WandSparklesIcon } from '@/components/icons/animated/wand-sparkles';
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
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type {
  GodmodeSettingItem,
  GodmodeSsoConnection,
  GodmodeStorageMigration,
} from '@/lib/godmode/types';
import { OAUTH_PROVIDER_LOGOS } from './oauth-logos';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

interface EditorValue {
  value: string | boolean | number;
}

function initialEditorValue(item: GodmodeSettingItem): EditorValue {
  if (item.type === 'boolean') {
    return { value: item.value === true };
  }
  return { value: String(item.value ?? item.defaultValue ?? '') };
}

// Long-form documents get a dedicated editor instead of a one-line input.
const LEGAL_DOC_KEYS = new Set(['legal.termsText', 'legal.privacyText']);

/**
 * Generic settings renderer driven by the godmode settings registry.
 * Renders every registry item type (boolean switch, text, secret,
 * number, enum, json) and saves changed items in bulk. Sections with a
 * dedicated UI render their own panel: sign-in methods, OAuth providers,
 * SSO connections, and storage.
 *
 * Dirty tracking is sticky: once a control is touched, Save and Discard
 * stay visible until one of them is used, even when the value is edited
 * back to what it was. That keeps "you changed something" feedback
 * consistent across every control type.
 */
export function SettingsEditor({
  items,
  allItems,
  ssoConnections,
  onDirtyChange,
  onSaved,
  onNavigate,
  onSsoChanged,
}: {
  items: GodmodeSettingItem[];
  /** Every registry item; used to resolve cross-section dependencies
   *  (visibleWhen / disabledWhen can reference keys in other groups). */
  allItems?: GodmodeSettingItem[];
  /** Tenant SSO directories managed by the dedicated SSO panel. */
  ssoConnections?: GodmodeSsoConnection[];
  /** Fired when the set of unsaved edits becomes non-empty / empty. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Fired after settings were saved successfully (lets the host refresh). */
  onSaved?: () => void;
  /** Jumps to another godmode section (dependency and action CTAs). */
  onNavigate?: (section: string) => void;
  /** Fired after an SSO connection changed (lets the host refresh). */
  onSsoChanged?: () => void;
}) {
  const { show } = useToast();
  const [values, setValues] = useState<Record<string, EditorValue>>({});
  /** Keys the admin has touched; sticky until Save or Discard. */
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  /** Incremented after every successful save; the storage panel polls then. */
  const [saveTick, setSaveTick] = useState(0);

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
    setTouched(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSignature]);

  const dirtyCount = touched.size;
  useEffect(() => {
    onDirtyChange?.(dirtyCount > 0);
  }, [dirtyCount, onDirtyChange]);

  const set = useCallback((key: string, value: EditorValue['value']) => {
    setValues((prev) => ({ ...prev, [key]: { value } }));
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
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

  // Provider-conditional fields (email.smtp.*, sms.twilio.*, storage.s3.*)
  // render only while their provider dropdown points at them. Hidden fields
  // keep their values in state and are still saved if touched, so switching
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
    (item: GodmodeSettingItem): { hint: string; section: string } | null => {
      const rule = item.disabledWhen;
      if (!rule) return null;
      return rule.oneOf.includes(String(depValue(rule.key)))
        ? { hint: rule.hint, section: rule.section }
        : null;
    },
    [depValue],
  );

  const isOauthGroup = items.length > 0 && items.every((i) => i.group === 'oauth');
  const isAuthGroup = items.length > 0 && items.every((i) => i.group === 'auth');
  const isSsoGroup = items.length > 0 && items.every((i) => i.group === 'sso');
  const isStorageGroup = items.length > 0 && items.every((i) => i.group === 'storage');

  const hasInvalidJson = visibleItems.some(
    (i) => i.type === 'json' && !isValidJson(String(values[i.key]?.value ?? '')),
  );

  const save = useCallback(async () => {
    const itemByKey = new Map(items.map((i) => [i.key, i]));
    const changed = Object.entries(values)
      .filter(([key]) => touched.has(key))
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
      // Reset to the server snapshot (items). Normally the host refetch
      // re-initializes everything, but when the saved values happen to be
      // what the server already had (e.g. a storage provider switch that
      // stays pending behind a migration), the snapshot is unchanged and
      // the refetch would NOT reset the form. Do it explicitly so the
      // controls always show server truth after a save.
      setValues(() => {
        const next: Record<string, EditorValue> = {};
        for (const item of items) next[item.key] = initialEditorValue(item);
        return next;
      });
      setTouched(new Set());
      setSaveTick((t) => t + 1);
      show({
        title: 'Saved',
        description: `${changed.length} setting(s) updated.`,
        tone: 'success',
      });
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
  }, [values, touched, items, show, onSaved]);

  const discard = useCallback(() => {
    const next: Record<string, EditorValue> = {};
    for (const item of items) next[item.key] = initialEditorValue(item);
    setValues(next);
    setTouched(new Set());
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      {isOauthGroup ? (
        <OAuthProvidersPanel items={items} values={values} onChange={set} />
      ) : isAuthGroup ? (
        <AuthMethodsPanel
          items={items}
          values={values}
          onChange={set}
          disabledHint={disabledHint}
          onNavigate={onNavigate}
        />
      ) : isSsoGroup ? (
        <SsoConnectionsPanel connections={ssoConnections ?? []} onChanged={onSsoChanged} />
      ) : isStorageGroup ? (
        <StoragePanel
          items={items}
          values={values}
          onChange={set}
          onSaved={onSaved}
          saveTick={saveTick}
        />
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
                    {item.moreInfo ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`More about ${item.label}`}
                              className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 transition-colors duration-120 hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            >
                              <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{item.moreInfo}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-[13px] text-ink-3">{item.description}</p>
                  ) : null}
                  {item.action && onNavigate ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(item.action!.section)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {item.action.label}
                      <ArrowRightIcon size={12} className="flex items-center justify-center" />
                    </button>
                  ) : null}
                  {hint ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-brand-yellow-ink">
                      <span className="flex items-start gap-1.5">
                        <span aria-hidden>!</span>
                        {hint.hint}
                      </span>
                      {onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate(hint.section)}
                          className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                        >
                          Configure now
                          <ArrowRightIcon size={12} className="flex items-center justify-center" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
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
          <Button variant="secondary" size="sm" onClick={discard}>
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            Discard
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || hasInvalidJson}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
            ) : (
              <CheckIcon size={16} className="flex items-center justify-center" />
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
  if (LEGAL_DOC_KEYS.has(item.key) || item.fileUpload) {
    return <LongTextControl item={item} entry={entry} onChange={onChange} />;
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
        <SelectTrigger className="w-[240px]" aria-label={item.label}>
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
 * Long-form content (legal documents, .p8 keys, certificates) gets a
 * right-anchored Edit button instead of a cramped inline field. The dialog
 * shows the CURRENT content for editing and offers a file upload as the
 * preferred way to fill it; Apply stages the text into the form, where it
 * joins the other pending changes until Save is pressed.
 */
function LongTextControl({
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
  const isUpload = Boolean(item.fileUpload);

  const openEditor = () => {
    setDraft(value);
    setOpen(true);
  };

  return (
    <div className="flex w-[280px] justify-end">
      <Button variant="secondary" size="sm" onClick={openEditor}>
        {isUpload ? (
          <Upload className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <FileText className="h-4 w-4" strokeWidth={2.25} />
        )}
        {isUpload ? 'Upload file' : 'Edit'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="w-[calc(100%-2rem)]">
          <DialogTitle>{item.label}</DialogTitle>
          <DialogDescription>
            {isUpload
              ? item.fileUpload!.hint
              : `${item.description} Paste the document below, or upload a Markdown file.`}
          </DialogDescription>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            className="mt-5 min-h-[300px] w-full font-normal text-[13px]"
            aria-label={`${item.label} content`}
            placeholder={isUpload ? 'Paste the file contents here.' : '# ' + item.label}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={item.fileUpload?.accept ?? '.md,.markdown,text/markdown,text/plain'}
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
              {isUpload ? 'Upload file' : 'Upload .md file'}
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
              <CheckIcon size={16} className="flex items-center justify-center" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sign-in methods ─────────────────────────────────────────────────

interface MethodGroup {
  id: string;
  enabledKey: string;
  fields: string[];
}

const SIGN_IN_METHODS: MethodGroup[] = [
  { id: 'emailPassword', enabledKey: 'auth.emailPassword.enabled', fields: [] },
  { id: 'magicLink', enabledKey: 'auth.magicLink.enabled', fields: [] },
  { id: 'phone', enabledKey: 'auth.phone.enabled', fields: ['auth.phone.otpEnabled'] },
  {
    id: 'passphrase',
    enabledKey: 'auth.passphrase.enabled',
    fields: ['auth.passphrase.value', 'auth.passphrase.role'],
  },
];

const METHOD_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  emailPassword: MailIcon,
  magicLink: WandSparklesIcon,
  phone: PhoneIcon,
  passphrase: KeyIcon,
};

/**
 * Sign-in methods render as one card per method with an icon, matching
 * the OAuth providers panel. The passphrase card keeps its secret and
 * role inside; enabling a method reveals its extra options.
 */
function AuthMethodsPanel({
  items,
  values,
  onChange,
  disabledHint,
  onNavigate,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
  disabledHint: (item: GodmodeSettingItem) => { hint: string; section: string } | null;
  onNavigate?: (section: string) => void;
}) {
  const itemByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  const methods = useMemo(
    () =>
      SIGN_IN_METHODS.map((m) => {
        const head = itemByKey.get(m.enabledKey);
        return {
          ...m,
          head: head ?? null,
          fields: m.fields
            .map((k) => itemByKey.get(k))
            .filter((i): i is GodmodeSettingItem => Boolean(i)),
        };
      }).filter((m) => m.head),
    [itemByKey],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-3">
        The methods people can use on the login page. Options that need a provider keep their
        configuration when switched off.
      </p>
      {methods.map((method) => {
        const head = method.head!;
        const enabled = values[method.enabledKey]?.value === true;
        const Icon = METHOD_ICONS[method.id];
        const expanded = openOverrides[method.id] ?? enabled;
        const hint = disabledHint(head);
        return (
          <div key={method.id} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                {Icon ? <Icon className="h-5 w-5" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink">{head.label}</div>
                {head.description ? (
                  <p className="mt-0.5 text-[12px] text-ink-4">{head.description}</p>
                ) : null}
                {hint ? (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-brand-yellow-ink">
                    <span className="flex items-start gap-1.5">
                      <span aria-hidden>!</span>
                      {hint.hint}
                    </span>
                    {onNavigate && hint.section !== 'auth' ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(hint.section)}
                        className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                      >
                        Configure now
                        <ArrowRightIcon size={12} className="flex items-center justify-center" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {method.fields.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setOpenOverrides((prev) => ({ ...prev, [method.id]: !expanded }))
                  }
                  aria-expanded={expanded}
                  aria-label={`Show ${head.label} options`}
                  className="inline-grid h-9 w-9 place-items-center rounded text-ink-3 transition-colors duration-120 hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <ChevronDownIcon
                    size={16}
                    className={cn('flex items-center justify-center transition-transform duration-200', expanded && 'rotate-180')}
                  />
                </button>
              ) : null}
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  onChange(method.enabledKey, v);
                  setOpenOverrides((prev) => ({ ...prev, [method.id]: Boolean(v) }));
                }}
                disabled={Boolean(hint)}
                aria-label={head.label}
              />
            </div>
            {expanded && method.fields.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 pl-12">
                {method.fields.map((field) => {
                  const entry = values[field.key];
                  if (!entry) return null;
                  const fieldHint = disabledHint(field);
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
                        {fieldHint ? (
                          <p className="mt-1 text-[12.5px] text-brand-yellow-ink">
                            <span aria-hidden>! </span>
                            {fieldHint.hint}
                          </p>
                        ) : null}
                      </div>
                      <div className={cn('shrink-0', fieldHint && 'opacity-50')}>
                        <SettingControl
                          item={field}
                          entry={entry}
                          jsonValid
                          disabled={Boolean(fieldHint)}
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

// ─── OAuth providers ────────────────────────────────────────────────

interface ProviderGroup {
  id: string;
  label: string;
  docUrl?: string;
  enabledKey: string;
  fields: GodmodeSettingItem[];
}

/**
 * The OAuth group renders as a list of providers, one card each. The card
 * shows the brand logo and a switch; clicking anywhere on the header
 * expands the configuration. Each provider links to its official setup
 * guide and shows the exact callback URL to register there. Disabled
 * providers keep their saved credentials, so re-enabling never asks for
 * them again.
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
  const { show } = useToast();
  const [callbacks, setCallbacks] = useState<Record<string, string>>({});

  // Callback URLs come from a public endpoint, no godmode token needed.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/auth/oauth-callbacks`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setCallbacks(data as Record<string, string>);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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
        group.docUrl = item.docUrl;
      } else {
        group.fields.push(item);
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    show({ title: 'Copied', description: label, tone: 'success' });
  };

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
        const callback = callbacks[provider.id];
        return (
          <div key={provider.id} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex items-center gap-3">
              {/* The whole header toggles the configuration, not just the chevron. */}
              <button
                type="button"
                onClick={() =>
                  setOpenOverrides((prev) => ({ ...prev, [provider.id]: !expanded }))
                }
                aria-expanded={expanded}
                aria-label={`Show ${provider.label} configuration`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                  {Logo ? <Logo className="h-5 w-5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{provider.label}</span>
                </span>
                <ChevronDownIcon
                  size={16}
                  className={cn('flex shrink-0 items-center justify-center text-ink-3 transition-transform duration-200', expanded && 'rotate-180')}
                />
              </button>
              {provider.docUrl ? (
                <a
                  href={provider.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded text-[12px] font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Setup guide
                  <ExternalLinkIcon size={12} className="flex items-center justify-center" />
                </a>
              ) : null}
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
                {callback ? (
                  <div className="flex flex-wrap items-center gap-2 rounded bg-surface-muted px-3 py-2">
                    <span className="text-[12px] text-ink-3">Callback URL</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-2">
                      {callback}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(callback, 'Callback URL copied.')}
                      className="inline-grid h-6 w-6 place-items-center rounded text-ink-3 transition-colors duration-120 hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      aria-label="Copy callback URL"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </button>
                  </div>
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

// ─── SSO connections (tenant directories) ───────────────────────────

const SSO_TYPE_LABELS: Record<string, string> = { oidc: 'OIDC', saml: 'SAML' };

interface SsoDraft {
  name: string;
  type: 'oidc' | 'saml';
  domains: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  entryPoint: string;
  spIssuer: string;
  cert: string;
  privateKey: string;
}

function emptyDraft(): SsoDraft {
  return {
    name: '',
    type: 'oidc',
    domains: '',
    issuer: '',
    clientId: '',
    clientSecret: '',
    entryPoint: '',
    spIssuer: '',
    cert: '',
    privateKey: '',
  };
}

/**
 * Tenant SSO directories. An instance can connect as many companies as it
 * wants, each with its own OIDC or SAML configuration; the login page
 * lists every enabled connection as its own button. Credentials for a
 * connection are encrypted at rest.
 */
function SsoConnectionsPanel({
  connections,
  onChanged,
}: {
  connections: GodmodeSsoConnection[];
  onChanged?: () => void;
}) {
  const { show } = useToast();
  const confirm = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GodmodeSsoConnection | null>(null);
  const [draft, setDraft] = useState<SsoDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEdit = (conn: GodmodeSsoConnection) => {
    setEditing(conn);
    setDraft({
      name: conn.name,
      type: conn.type,
      domains: conn.domains.join(', '),
      issuer: conn.config.issuer ?? '',
      clientId: conn.config.clientId ?? '',
      clientSecret: '',
      entryPoint: conn.config.entryPoint ?? '',
      spIssuer: conn.config.spIssuer ?? '',
      cert: '',
      privateKey: '',
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const config: Record<string, string> =
        draft.type === 'oidc'
          ? { issuer: draft.issuer.trim(), clientId: draft.clientId.trim(), clientSecret: draft.clientSecret.trim() }
          : {
              entryPoint: draft.entryPoint.trim(),
              spIssuer: draft.spIssuer.trim(),
              cert: draft.cert.trim(),
              privateKey: draft.privateKey.trim(),
            };
      const payload = {
        name: draft.name.trim(),
        type: draft.type,
        enabled: editing?.enabled ?? false,
        domains: draft.domains.split(',').map((d) => d.trim()).filter(Boolean),
        config,
      };
      if (editing) {
        await godmodeFetch(godmodePaths.ssoConnection(editing.id), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        show({ title: 'Saved', description: `${draft.name.trim()} updated.`, tone: 'success' });
      } else {
        await godmodeFetch(godmodePaths.ssoConnections(), {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        show({ title: 'Added', description: `${draft.name.trim()} is ready to enable.`, tone: 'success' });
      }
      setDialogOpen(false);
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

  const toggle = async (conn: GodmodeSsoConnection, enabled: boolean) => {
    setBusyId(conn.id);
    try {
      await godmodeFetch(godmodePaths.ssoConnectionEnabled(conn.id), {
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

  const remove = async (conn: GodmodeSsoConnection) => {
    const ok = await confirm({
      title: `Delete ${conn.name}?`,
      description: 'People from this directory will lose that sign-in button. Their accounts stay intact.',
      confirmLabel: 'Delete connection',
    });
    if (!ok) return;
    try {
      await godmodeFetch(godmodePaths.ssoConnection(conn.id), { method: 'DELETE' });
      show({ title: 'Deleted', description: `${conn.name} removed.`, tone: 'success' });
      onChanged?.();
    } catch (err) {
      show({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    }
  };

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    show({ title: 'Copied', description: label, tone: 'success' });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[560px] text-[13px] text-ink-3">
          Connect company directories (Okta, Entra ID, Google Workspace, and more) so each
          organization signs in with its own OIDC or SAML setup. Every enabled connection gets
          its own button on the login page.
        </p>
        <Button size="sm" variant="secondary" onClick={openCreate}>
          <PlusIcon size={16} className="flex items-center justify-center" />
          Add directory
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="rounded border border-line bg-surface p-8 text-center text-[14px] text-ink-3 shadow-1">
          No directories connected yet. Add one to let a company sign in with their own identity
          provider.
        </div>
      ) : null}

      {connections.map((conn) => {
        const Icon = conn.type === 'saml' ? Fingerprint : KeyIcon;
        const urlBase = conn.type === 'saml'
          ? `${API_BASE}/auth/sso/${conn.id}/saml/acs`
          : `${API_BASE}/auth/sso/${conn.id}/oidc/callback`;
        return (
          <div key={conn.id} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                <Icon size={18} className="flex items-center justify-center" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-medium text-ink">{conn.name}</span>
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {SSO_TYPE_LABELS[conn.type] ?? conn.type}
                  </span>
                  {conn.domains.length > 0 ? (
                    <span className="text-[12px] text-ink-4">
                      domains: {conn.domains.join(', ')}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
                  <span className="shrink-0">
                    {conn.type === 'saml' ? 'ACS URL' : 'Callback URL'}
                  </span>
                  <code className="min-w-0 max-w-[420px] truncate font-mono text-[11px] text-ink-2">
                    {urlBase}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(urlBase, conn.type === 'saml' ? 'ACS URL copied.' : 'Callback URL copied.')}
                    className="inline-grid h-6 w-6 place-items-center rounded text-ink-3 transition-colors duration-120 hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    aria-label={`Copy ${conn.type === 'saml' ? 'ACS URL' : 'callback URL'} for ${conn.name}`}
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(conn)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void remove(conn)}
                  aria-label={`Delete ${conn.name}`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                </Button>
                <Switch
                  checked={conn.enabled}
                  onCheckedChange={(v) => void toggle(conn, v)}
                  disabled={busyId === conn.id}
                  aria-label={`${conn.name} sign-in`}
                />
              </div>
            </div>
          </div>
        );
      })}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg" className="w-[calc(100%-2rem)]">
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a company directory'}</DialogTitle>
          <DialogDescription>
            Choose how this organization signs in, then paste the details from their identity
            provider.
          </DialogDescription>
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink">Name</span>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Acme workspace"
                aria-label="Directory name"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink">Protocol</span>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v as 'oidc' | 'saml' }))}
              >
                <SelectTrigger className="w-[240px]" aria-label="Protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oidc">OIDC (OpenID Connect)</SelectItem>
                  <SelectItem value="saml">SAML 2.0</SelectItem>
                </SelectContent>
              </Select>
            </label>
            {draft.type === 'oidc' ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Issuer URL</span>
                  <Input
                    value={draft.issuer}
                    onChange={(e) => setDraft((d) => ({ ...d, issuer: e.target.value }))}
                    placeholder="https://your-org.okta.com"
                    aria-label="Issuer URL"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Client id</span>
                  <Input
                    value={draft.clientId}
                    onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value }))}
                    aria-label="Client id"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Client secret</span>
                  <Input
                    type="password"
                    value={draft.clientSecret}
                    onChange={(e) => setDraft((d) => ({ ...d, clientSecret: e.target.value }))}
                    autoComplete="new-password"
                    placeholder={editing?.config.secretSet?.clientSecret ? '•••••••• (set, leave blank to keep)' : 'Not set'}
                    aria-label="Client secret"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">IdP entry point</span>
                  <Input
                    value={draft.entryPoint}
                    onChange={(e) => setDraft((d) => ({ ...d, entryPoint: e.target.value }))}
                    placeholder="https://acme.okta.com/app/atlas/.../sso/saml"
                    aria-label="IdP entry point"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">SP entity id (optional)</span>
                  <Input
                    value={draft.spIssuer}
                    onChange={(e) => setDraft((d) => ({ ...d, spIssuer: e.target.value }))}
                    placeholder="Leave empty to use the instance URL"
                    aria-label="SP entity id"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">IdP certificate</span>
                  <Textarea
                    value={draft.cert}
                    onChange={(e) => setDraft((d) => ({ ...d, cert: e.target.value }))}
                    rows={4}
                    className="font-mono text-[12px]"
                    placeholder="Paste the X.509 certificate (PEM), or leave the box to keep the stored one"
                    aria-label="IdP certificate"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Signing private key (optional)</span>
                  <Textarea
                    value={draft.privateKey}
                    onChange={(e) => setDraft((d) => ({ ...d, privateKey: e.target.value }))}
                    rows={4}
                    className="font-mono text-[12px]"
                    placeholder="Only if your IdP expects signed requests"
                    aria-label="Signing private key"
                  />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink">Email domains (optional)</span>
              <Input
                value={draft.domains}
                onChange={(e) => setDraft((d) => ({ ...d, domains: e.target.value }))}
                placeholder="acme.com, acme.co.id"
                aria-label="Email domains"
              />
              <span className="text-[12px] text-ink-4">
                Comma separated. When someone types a matching email on the login page, this
                directory is highlighted.
              </span>
            </label>
          </div>
          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" onClick={() => void submit()} disabled={saving}>
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
              ) : (
                <CheckIcon size={16} className="flex items-center justify-center" />
              )}
              {editing ? 'Save' : 'Add directory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Storage ────────────────────────────────────────────────────────

const STORAGE_PROVIDER_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  local: HardDriveIcon,
  s3: CloudIcon,
  r2: CloudCogIcon,
  s3compat: BoxIcon,
  disabled: Ban,
};

/**
 * Storage settings with the provider dropdown (icons per provider) and
 * the migration flow. Switching providers never applies instantly: the
 * save triggers a background copy of every stored object, and the active
 * provider only flips when the copy finishes cleanly. Progress, failures,
 * and the retry button render here.
 */
function StoragePanel({
  items,
  values,
  onChange,
  onSaved,
  saveTick,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
  onSaved?: () => void;
  /** Bumped by the editor after each successful save (re-poll migration). */
  saveTick: number;
}) {
  const { show } = useToast();
  const [migration, setMigration] = useState<GodmodeStorageMigration | null | undefined>(
    undefined,
  );
  const migrationRef = useRef<GodmodeStorageMigration | null | undefined>(undefined);

  const poll = useCallback(async () => {
    try {
      const m = await godmodeFetch<GodmodeStorageMigration | null>(
        godmodePaths.storageMigration(),
      );
      const prev = migrationRef.current;
      migrationRef.current = m;
      setMigration(m);
      if (prev && prev.status === 'RUNNING' && m && m.status === 'COMPLETED') {
        // The provider just flipped server-side; refresh the settings view.
        onSaved?.();
      }
    } catch {
      // Unlock expiry or network hiccup; the next poll retries.
    }
  }, [onSaved]);

  useEffect(() => {
    void poll();
  }, [poll, saveTick]);

  useEffect(() => {
    if (migration?.status === 'RUNNING') {
      const timer = setInterval(() => void poll(), 3000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [migration?.status, poll]);

  const providerItem = items.find((i) => i.key === 'storage.provider');
  const provider = String(values['storage.provider']?.value ?? providerItem?.value ?? 'local');
  const fields = items.filter((i) => i.key !== 'storage.provider');
  const visibleFields = fields.filter((item) => {
    const rule = item.visibleWhen;
    if (!rule) return true;
    return rule.oneOf.includes(provider);
  });

  const retry = async () => {
    try {
      await godmodeFetch(godmodePaths.storageMigrationRetry(), { method: 'POST' });
      void poll();
    } catch (err) {
      show({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {migration && migration.status === 'RUNNING' ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded border border-brand-blue/30 bg-brand-blue-50 px-4 py-3 text-[13px]"
        >
          <LoaderCircle className="h-4 w-4 animate-spin text-brand-blue" strokeWidth={2.25} />
          <span className="text-ink">
            Migrating files from {providerLabel(migration.fromProvider)} to{' '}
            {providerLabel(migration.toProvider)}
          </span>
          <span className="ml-auto tabular-nums text-ink-2">
            {migration.transferredCount} of {migration.objectCount} objects
            {migration.objectCount > 0
              ? ` (${Math.min(100, Math.round((migration.transferredCount / migration.objectCount) * 100))}%)`
              : ''}
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-blue-strong transition-[width] duration-320"
              style={{
                width: `${migration.objectCount > 0 ? (migration.transferredCount / migration.objectCount) * 100 : 100}%`,
              }}
            />
          </div>
          <p className="w-full text-[12px] text-ink-3">
            Uploads keep working through the current provider while files copy. The switch
            completes on its own when every object is on the new provider.
          </p>
        </div>
      ) : null}
      {migration && (migration.status === 'FAILED' || migration.status === 'INTERRUPTED') ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13px]"
        >
          <span className="font-medium text-brand-red">
            {migration.status === 'INTERRUPTED' ? 'Migration was interrupted' : 'Migration failed'}
          </span>
          <span className="min-w-0 flex-1 text-ink-2">
            {migration.error ?? `From ${providerLabel(migration.fromProvider)} to ${providerLabel(migration.toProvider)}.`}{' '}
            The active provider was left unchanged, your files are safe.
          </span>
          <Button variant="secondary" size="sm" onClick={() => void retry()}>
            Retry
          </Button>
        </div>
      ) : null}

      {providerItem ? (
        <div className="rounded border border-line bg-surface p-4 shadow-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-ink">{providerItem.label}</span>
                {providerItem.moreInfo ? (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`More about ${providerItem.label}`}
                          className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 transition-colors duration-120 hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                          <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>{providerItem.moreInfo}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
              {providerItem.description ? (
                <p className="mt-1 text-[13px] text-ink-3">{providerItem.description}</p>
              ) : null}
            </div>
            <div className="shrink-0">
              <Select value={provider} onValueChange={(v) => onChange('storage.provider', v)}>
                <SelectTrigger className="w-[240px]" aria-label={providerItem.label}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(providerItem.options ?? []).map((o) => {
                    const Icon = STORAGE_PROVIDER_ICONS[o.value];
                    return (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          {Icon ? <Icon size={16} className="flex items-center justify-center text-ink-3" /> : null}
                          {o.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}

      {visibleFields.map((field) => {
        const entry = values[field.key];
        if (!entry) return null;
        return (
          <div key={field.key} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ink">{field.label}</span>
                  {field.secret ? (
                    <span className="rounded bg-brand-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-blue">
                      secret
                    </span>
                  ) : null}
                </div>
                {field.description ? (
                  <p className="mt-1 text-[13px] text-ink-3">{field.description}</p>
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
          </div>
        );
      })}
    </div>
  );
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    local: 'server local storage',
    s3: 'AWS S3',
    r2: 'Cloudflare R2',
    s3compat: 'S3-compatible storage',
    disabled: 'disabled storage',
  };
  return labels[provider] ?? provider;
}
