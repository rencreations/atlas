'use client';

import { useMemo, useState } from 'react';
import { ArrowRightIcon } from '@/components/icons/animated/arrow-right';
import { ChevronDownIcon } from '@/components/icons/animated/chevron-down';
import { KeyIcon } from '@/components/icons/animated/key-round';
import { MailIcon } from '@/components/icons/animated/mail';
import { PhoneIcon } from '@/components/icons/animated/phone';
import { WandSparklesIcon } from '@/components/icons/animated/wand-sparkles';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { InlineFieldRow, type EditorValue } from './setting-row';

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
 *
 * Icons are sized via the `size` prop, not a `className` width/height
 * utility: these are the animated icon components, whose inner SVG uses
 * an explicit pixel `size` attribute that a Tailwind class on the outer
 * wrapper div can't constrain, passing only a className rendered them at
 * their ~28px default inside a 36px badge, spilling past its edge.
 */
export function AuthMethodsPanel({
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
                {Icon ? <Icon size={20} /> : null}
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
                  return (
                    <InlineFieldRow
                      key={field.key}
                      item={field}
                      entry={entry}
                      hint={disabledHint(field)}
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
