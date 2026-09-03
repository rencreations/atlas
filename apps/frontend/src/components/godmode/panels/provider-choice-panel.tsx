'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { InlineFieldRow, type EditorValue } from './setting-row';

export interface ProviderCardOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  fields: GodmodeSettingItem[];
}

/**
 * A provider choice (email, SMS, storage) is a radio, not a set of
 * independent toggles: only one option is ever active. Clicking a card
 * both selects it and reveals its fields, the previously-selected card's
 * fields collapse, they stay saved for whenever it's picked again.
 */
export function ProviderChoicePanel({
  intro,
  providerItem,
  options,
  values,
  onChange,
  disabledHint,
  banner,
}: {
  intro?: string;
  providerItem: GodmodeSettingItem;
  options: ProviderCardOption[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
  disabledHint?: (item: GodmodeSettingItem) => { hint: string; section: string } | null;
  banner?: ReactNode;
}) {
  const selected = String(values[providerItem.key]?.value ?? '');
  return (
    <div className="flex flex-col gap-3">
      {intro ? <p className="text-[13px] text-ink-3">{intro}</p> : null}
      {banner}
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        const Icon = opt.icon;
        return (
          <div
            key={opt.value}
            className={cn(
              'rounded border bg-surface shadow-1 transition-colors duration-120',
              isSelected ? 'border-brand-blue' : 'border-line',
            )}
          >
            <button
              type="button"
              onClick={() => onChange(providerItem.key, opt.value)}
              aria-pressed={isSelected}
              className="flex w-full items-center gap-3 rounded p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                {Icon ? <Icon size={18} className="flex items-center justify-center" /> : null}
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-medium text-ink">{opt.label}</span>
              <span
                aria-hidden
                className={cn(
                  'inline-grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                  isSelected ? 'border-brand-blue' : 'border-line-strong',
                )}
              >
                {isSelected ? <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" /> : null}
              </span>
            </button>
            {isSelected && opt.fields.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-line p-4 pl-[4.25rem]">
                {opt.fields.map((field) => {
                  const entry = values[field.key];
                  if (!entry) return null;
                  const fieldHint = disabledHint?.(field) ?? null;
                  return (
                    <InlineFieldRow
                      key={field.key}
                      item={field}
                      entry={entry}
                      hint={fieldHint}
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
