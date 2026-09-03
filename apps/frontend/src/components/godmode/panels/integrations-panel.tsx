'use client';

import { useMemo, useState } from 'react';
import { BellIcon } from '@/components/icons/animated/bell';
import { ChevronDownIcon } from '@/components/icons/animated/chevron-down';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { InlineFieldRow, type EditorValue } from './setting-row';
import { INTEGRATION_LOGOS } from './service-logos';
import { GenerateVapidKeysButton } from './vapid-keys';

interface IntegrationCard {
  id: string;
  label: string;
  description: string;
  enabledKey: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  fieldPrefix: string;
}

const CARDS: IntegrationCard[] = [
  {
    id: 'n8n',
    label: 'n8n webhooks',
    description: 'Send workflow events to an n8n instance for email composition and automations.',
    enabledKey: 'integrations.n8n.enabled',
    icon: INTEGRATION_LOGOS.n8n,
    fieldPrefix: 'integrations.n8n.',
  },
  {
    id: 'gifs',
    label: 'GIF search (Klipy)',
    description: 'Klipy aggregates GIFs, stickers, and clips behind one key for the chat composer.',
    enabledKey: 'integrations.gifs.enabled',
    icon: INTEGRATION_LOGOS.klipy,
    fieldPrefix: 'integrations.gifs.',
  },
  {
    id: 'push',
    label: 'Web push notifications',
    description: 'Browser notifications for mentions, DMs, and task assignments.',
    enabledKey: 'integrations.push.enabled',
    icon: BellIcon,
    fieldPrefix: 'integrations.push.',
  },
];

/**
 * Integrations as cards, like OAuth providers: an icon, a switch, and the
 * fields reveal only once the integration is turned on. VAPID keys get a
 * one-click generator alongside the manual fields.
 */
export function IntegrationsPanel({
  items,
  values,
  onChange,
  onSaved,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
  onSaved?: () => void;
}) {
  const itemByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  const cards = useMemo(
    () =>
      CARDS.map((c) => ({
        ...c,
        head: itemByKey.get(c.enabledKey) ?? null,
        fields: items.filter((i) => i.key.startsWith(c.fieldPrefix) && i.key !== c.enabledKey),
      })).filter((c) => c.head),
    [items, itemByKey],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-3">
        Turn on the integrations you want. Each keeps its saved configuration when switched off.
      </p>
      {cards.map((card) => {
        const head = card.head!;
        const enabled = values[card.enabledKey]?.value === true;
        const Icon = card.icon;
        const expanded = openOverrides[card.id] ?? enabled;
        return (
          <div key={card.id} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpenOverrides((prev) => ({ ...prev, [card.id]: !expanded }))}
                aria-expanded={expanded}
                aria-label={`Show ${card.label} configuration`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{card.label}</span>
                  <span className="block text-[12px] text-ink-4">{card.description}</span>
                </span>
                <ChevronDownIcon
                  size={16}
                  className={cn(
                    'flex shrink-0 items-center justify-center text-ink-3 transition-transform duration-200',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  onChange(card.enabledKey, v);
                  setOpenOverrides((prev) => ({ ...prev, [card.id]: Boolean(v) }));
                }}
                aria-label={head.label}
              />
            </div>
            {expanded ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 pl-12">
                {card.fields.length > 0 && !enabled ? (
                  <p className="text-[12px] text-ink-4">
                    Saved configuration stays here while this is off.
                  </p>
                ) : null}
                {card.id === 'push' ? (
                  <GenerateVapidKeysButton
                    onGenerated={() => onSaved?.()}
                  />
                ) : null}
                {card.fields.map((field) => {
                  const entry = values[field.key];
                  if (!entry) return null;
                  return (
                    <InlineFieldRow
                      key={field.key}
                      item={field}
                      entry={entry}
                      hint={null}
                      onChange={(v) => onChange(field.key, v)}
                    />
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
