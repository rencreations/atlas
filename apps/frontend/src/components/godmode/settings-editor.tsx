'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { CheckIcon } from '@/components/icons/animated/check';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type {
  GodmodeSettingGroup,
  GodmodeSettingItem,
  GodmodeSsoConnection,
} from '@/lib/godmode/types';
import { AppearancePanel } from './panels/appearance-panel';
import { AuthMethodsPanel } from './panels/auth-methods-panel';
import { EmailProviderPanel } from './panels/email-provider-panel';
import { IntegrationsPanel } from './panels/integrations-panel';
import { ModulesPanel } from './panels/modules-panel';
import { OAuthProvidersPanel } from './panels/oauth-providers-panel';
import { isValidJson, initialEditorValue, SettingRow, type EditorValue } from './panels/setting-row';
import { SmsProviderPanel } from './panels/sms-provider-panel';
import { SsoConnectionsPanel } from './panels/sso-connections-panel';
import { StoragePanel } from './panels/storage-panel';

/** Sub-heading override for a group rendered inside a merged section
 *  (Site: site+legal+appearance+modules; Advanced: system+godmode). The
 *  registry label reads fine as a standalone page title but is redundant
 *  or unclear as a sub-heading, so a few get a friendlier one here. */
const GROUP_HEADING_OVERRIDES: Record<string, string> = {
  site: 'Site identity',
  legal: 'Legal documents',
  system: 'Instance',
  godmode: 'Godmode security',
};

/**
 * Generic settings renderer driven by the godmode settings registry.
 * Groups with a dedicated UI render their own panel (sign-in methods,
 * OAuth providers, SSO connections, storage, email, SMS, integrations,
 * appearance, modules); everything else renders as a plain field list.
 * A section can merge several registry groups (Site: site + legal +
 * appearance + modules; Advanced: system + godmode), in which case each
 * group's block gets its own sub-heading.
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
  groups,
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
  /** Registry group metadata, used for merged-section sub-headings. */
  groups?: GodmodeSettingGroup[];
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

  // Dependencies may live in other sections (email.provider gates the
  // magic-link toggle in Sign-in methods), so resolve them against the
  // full registry view rather than just this section's items.
  const lookupItems = useMemo(() => allItems ?? items, [allItems, items]);

  const disabledHint = useCallback(
    (item: GodmodeSettingItem): { hint: string; section: string } | null => {
      const rule = item.disabledWhen;
      if (!rule) return null;
      const dep =
        values[rule.key]?.value ?? lookupItems.find((i) => i.key === rule.key)?.value ?? '';
      return rule.oneOf.includes(String(dep)) ? { hint: rule.hint, section: rule.section } : null;
    },
    [lookupItems, values],
  );

  const hasInvalidJson = items.some(
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

  // Groups present in this section, in first-appearance order (the host
  // controls that order via each Section's `groups` array).
  const groupOrder = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) if (!seen.includes(item.group)) seen.push(item.group);
    return seen;
  }, [items]);

  const renderGroup = (group: string, groupItems: GodmodeSettingItem[]) => {
    switch (group) {
      case 'oauth':
        return <OAuthProvidersPanel items={groupItems} values={values} onChange={set} />;
      case 'auth':
        return (
          <AuthMethodsPanel
            items={groupItems}
            values={values}
            onChange={set}
            disabledHint={disabledHint}
            onNavigate={onNavigate}
          />
        );
      case 'sso':
        return <SsoConnectionsPanel connections={ssoConnections ?? []} onChanged={onSsoChanged} />;
      case 'storage':
        return (
          <StoragePanel
            items={groupItems}
            values={values}
            onChange={set}
            onSaved={onSaved}
            saveTick={saveTick}
          />
        );
      case 'email':
        return (
          <EmailProviderPanel
            items={groupItems}
            values={values}
            onChange={set}
            disabledHint={disabledHint}
          />
        );
      case 'sms':
        return (
          <SmsProviderPanel
            items={groupItems}
            values={values}
            onChange={set}
            disabledHint={disabledHint}
          />
        );
      case 'integrations':
        return (
          <IntegrationsPanel items={groupItems} values={values} onChange={set} onSaved={onSaved} />
        );
      case 'appearance':
        return <AppearancePanel items={groupItems} values={values} onChange={set} />;
      case 'modules':
        return <ModulesPanel items={groupItems} values={values} onChange={set} />;
      default:
        return (
          <div className="flex flex-col gap-4">
            {groupItems.map((item) => {
              const entry = values[item.key];
              if (!entry) return null;
              return (
                <SettingRow
                  key={item.key}
                  item={item}
                  entry={entry}
                  hint={disabledHint(item)}
                  onNavigate={onNavigate}
                  onChange={(v) => set(item.key, v)}
                />
              );
            })}
          </div>
        );
    }
  };

  const multiGroup = groupOrder.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-8">
        {groupOrder.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          const label = GROUP_HEADING_OVERRIDES[group] ?? groups?.find((g) => g.slug === group)?.label;
          return (
            <div key={group} className="flex flex-col gap-3">
              {multiGroup && label ? (
                <h3 className="text-eyebrow uppercase text-ink-4">{label}</h3>
              ) : null}
              {renderGroup(group, groupItems)}
            </div>
          );
        })}
      </div>

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
