'use client';

import type { ComponentType } from 'react';
import { ListTodo, Mic, Rocket } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import type { EditorValue } from './setting-row';

const MODULE_ICONS: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  'modules.pmo.enabled': ListTodo,
  'modules.voice.enabled': Mic,
};

/** Feature modules as toggle cards with an icon, matching sign-in methods. */
export function ModulesPanel({
  items,
  values,
  onChange,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-3">
        Whole feature areas, off by default so a fresh instance ships focused. Turning one on
        doesn’t need a redeploy.
      </p>
      {items.map((item) => {
        const Icon = MODULE_ICONS[item.key] ?? Rocket;
        const entry = values[item.key];
        if (!entry) return null;
        return (
          <div key={item.key} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink">{item.label}</div>
                {item.description ? (
                  <p className="mt-0.5 text-[12px] text-ink-4">{item.description}</p>
                ) : null}
              </div>
              <Switch
                checked={entry.value === true}
                onCheckedChange={(v) => onChange(item.key, v)}
                aria-label={item.label}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
