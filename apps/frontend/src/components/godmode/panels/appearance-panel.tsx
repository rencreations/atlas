'use client';

import { useEffect, useRef } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { previewTheme } from '@/lib/theme';
import { THEMES, type RGB, type ThemeMode } from '@/lib/themes/registry';
import { cn } from '@/lib/utils';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { SettingRow, type EditorValue } from './setting-row';

const MODE_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function rgbCss(c: RGB): string {
  return `rgb(${c.join(' ')} / 1)`;
}

/** Mini palette preview: light + dark rows, primary swatch, ink bar. */
function ThemePreview({ id }: { id: string }) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  return (
    <div aria-hidden className="overflow-hidden rounded-md border border-line">
      {(['light', 'dark'] as const).map((m) => {
        const p = theme[m];
        return (
          <div key={m} className="flex h-9 items-stretch">
            <div className="flex w-1/2 items-center gap-1.5 px-2" style={{ background: rgbCss(p.bg) }}>
              <span className="h-4 w-4 rounded-full" style={{ background: rgbCss(p.brandBlue) }} />
            </div>
            <div
              className="flex w-1/2 items-center gap-1.5 border-l border-line px-2"
              style={{ background: rgbCss(p.surface) }}
            >
              <span className="h-1.5 w-10 rounded-full" style={{ background: rgbCss(p.ink) }} />
              <span className="h-1.5 w-4 rounded-full" style={{ background: rgbCss(p.ink4) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Theme swatches, clickable instead of a dropdown with just a name, and
 * previewed live on the godmode chrome itself as soon as one is clicked
 * (before Save). Godmode always renders the instance default (never the
 * visiting admin's own personal theme, see ThemeProvider), so this is
 * literally what every other visitor will see once saved.
 */
export function AppearancePanel({
  items,
  values,
  onChange,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
}) {
  const themeItem = items.find((i) => i.key === 'appearance.defaultTheme');
  const modeItem = items.find((i) => i.key === 'appearance.defaultThemeMode');
  const allowItem = items.find((i) => i.key === 'appearance.allowUserThemes');

  const draftThemeId = String(values['appearance.defaultTheme']?.value ?? '');
  const draftMode = String(values['appearance.defaultThemeMode']?.value ?? 'system') as ThemeMode;

  // Server truth to revert to once this panel leaves the screen (section
  // switch, or a discard elsewhere resetting the draft back to it, which
  // this same live-preview effect then re-applies automatically).
  const serverTruth = useRef({ id: draftThemeId, mode: draftMode });
  useEffect(() => {
    serverTruth.current = {
      id: String(themeItem?.value ?? themeItem?.defaultValue ?? serverTruth.current.id),
      mode: (modeItem?.value as ThemeMode) ?? modeItem?.defaultValue as ThemeMode ?? serverTruth.current.mode,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeItem?.value, modeItem?.value]);

  useEffect(() => {
    if (!draftThemeId) return;
    previewTheme(draftThemeId, draftMode);
    return () => {
      previewTheme(serverTruth.current.id, serverTruth.current.mode);
    };
  }, [draftThemeId, draftMode]);

  if (!themeItem || !modeItem) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-eyebrow uppercase text-ink-4">Default mode</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = draftMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange('appearance.defaultThemeMode', opt.value)}
                aria-pressed={active}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded border p-3 text-left transition-colors duration-120',
                  active ? 'border-brand-blue bg-brand-blue-50' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-brand-blue' : 'text-ink-3')} strokeWidth={2.25} />
                <span className="text-[13.5px] font-medium text-ink">{opt.label}</span>
                {active ? <Check className="ml-auto h-4 w-4 text-brand-blue" strokeWidth={2.25} /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-eyebrow uppercase text-ink-4">Default theme</h3>
        <p className="text-[13px] text-ink-3">
          Clicking a theme previews it here immediately, this is what everyone sees once you
          save.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((theme) => {
            const active = draftThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChange('appearance.defaultTheme', theme.id)}
                aria-pressed={active}
                className={cn(
                  'relative rounded-lg border p-3 text-left transition-[border-color,box-shadow] duration-120',
                  active ? 'border-brand-blue shadow-2 ring-1 ring-brand-blue' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                {active ? (
                  <span className="absolute right-2.5 top-2.5 inline-grid h-5 w-5 place-items-center rounded-full bg-brand-blue-strong text-white">
                    <Check className="h-3 w-3" strokeWidth={2.25} />
                  </span>
                ) : null}
                <ThemePreview id={theme.id} />
                <span className="mt-2.5 block text-[14px] font-medium text-ink">{theme.name}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                  {theme.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {allowItem && values[allowItem.key] ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-eyebrow uppercase text-ink-4">User override</h3>
          <SettingRow
            item={allowItem}
            entry={values[allowItem.key]}
            hint={null}
            onChange={(v) => onChange(allowItem.key, v)}
          />
        </div>
      ) : null}
    </div>
  );
}
