'use client';

import { useMemo } from 'react';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { ProviderChoicePanel, type ProviderCardOption } from './provider-choice-panel';
import { SettingRow, type EditorValue } from './setting-row';
import { EMAIL_PROVIDER_LOGOS } from './service-logos';

const PROVIDER_LABELS: Record<string, string> = {
  console: 'Console (dev only)',
  smtp: 'SMTP',
  resend: 'Resend',
  ses: 'AWS SES',
};

/**
 * Email provider choice as cards, like OAuth providers: pick one, its
 * fields reveal in place instead of a dropdown plus a wall of every
 * provider's fields at once. Sender identity applies no matter which
 * provider is active, so it renders separately, always visible.
 */
export function EmailProviderPanel({
  items,
  values,
  onChange,
  disabledHint,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
  disabledHint: (item: GodmodeSettingItem) => { hint: string; section: string } | null;
}) {
  const providerItem = items.find((i) => i.key === 'email.provider');
  const { options, rest } = useMemo(() => {
    const byProvider = new Map<string, GodmodeSettingItem[]>();
    const leftover: GodmodeSettingItem[] = [];
    for (const item of items) {
      if (item.key === 'email.provider') continue;
      const dep = item.visibleWhen?.key === 'email.provider' ? item.visibleWhen.oneOf[0] : undefined;
      if (dep) {
        const list = byProvider.get(dep) ?? [];
        list.push(item);
        byProvider.set(dep, list);
      } else {
        leftover.push(item);
      }
    }
    const opts: ProviderCardOption[] = (providerItem?.options ?? []).map((o) => ({
      value: o.value,
      label: PROVIDER_LABELS[o.value] ?? o.label,
      icon: EMAIL_PROVIDER_LOGOS[o.value],
      fields: byProvider.get(o.value) ?? [],
    }));
    return { options: opts, rest: leftover };
  }, [items, providerItem]);

  if (!providerItem) return null;

  return (
    <div className="flex flex-col gap-6">
      <ProviderChoicePanel
        intro="How Atlas sends mail: magic links, verification, invites, and notifications. Pick one, credentials stay saved when you switch away."
        providerItem={providerItem}
        options={options}
        values={values}
        onChange={onChange}
        disabledHint={disabledHint}
      />
      {rest.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-eyebrow uppercase text-ink-4">Sender identity</h3>
          {rest.map((item) => {
            const entry = values[item.key];
            if (!entry) return null;
            return (
              <SettingRow
                key={item.key}
                item={item}
                entry={entry}
                hint={disabledHint(item)}
                onChange={(v) => onChange(item.key, v)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
