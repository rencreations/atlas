'use client';

import { useMemo } from 'react';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { ProviderChoicePanel, type ProviderCardOption } from './provider-choice-panel';
import { SettingRow, type EditorValue } from './setting-row';
import { SMS_PROVIDER_LOGOS } from './service-logos';

const PROVIDER_LABELS: Record<string, string> = {
  console: 'Console (dev only)',
  twilio: 'Twilio',
  vonage: 'Vonage',
  infobip: 'Infobip',
  sinch: 'Sinch',
  messagebird: 'MessageBird',
};

/** SMS/OTP provider choice, same card pattern as email. */
export function SmsProviderPanel({
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
  const providerItem = items.find((i) => i.key === 'sms.provider');
  const { options, rest } = useMemo(() => {
    const byProvider = new Map<string, GodmodeSettingItem[]>();
    const leftover: GodmodeSettingItem[] = [];
    for (const item of items) {
      if (item.key === 'sms.provider') continue;
      const dep = item.visibleWhen?.key === 'sms.provider' ? item.visibleWhen.oneOf[0] : undefined;
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
      icon: SMS_PROVIDER_LOGOS[o.value],
      fields: byProvider.get(o.value) ?? [],
    }));
    return { options: opts, rest: leftover };
  }, [items, providerItem]);

  if (!providerItem) return null;

  return (
    <div className="flex flex-col gap-6">
      <ProviderChoicePanel
        intro="Who delivers OTP codes for phone sign-in. Console prints codes to the server log, development only."
        providerItem={providerItem}
        options={options}
        values={values}
        onChange={onChange}
        disabledHint={disabledHint}
      />
      {rest.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-eyebrow uppercase text-ink-4">One-time code behavior</h3>
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
