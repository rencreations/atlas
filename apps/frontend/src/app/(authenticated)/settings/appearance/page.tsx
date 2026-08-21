'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/lib/theme';
import { DEFAULT_THEME_ID, THEMES, type RGB, type ThemeMode } from '@/lib/themes/registry';
import type { MeProfile, PublicConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

const MODE_OPTIONS: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { value: 'light', label: 'Light', description: 'Bright surfaces for daytime.', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Easier on the eyes in low light.', icon: Moon },
  { value: 'system', label: 'System', description: 'Follows your device setting.', icon: Monitor },
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
            <div
              className="flex w-1/2 items-center gap-1.5 px-2"
              style={{ background: rgbCss(p.bg) }}
            >
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

export default function AppearanceSettingsPage() {
  const { themeId, mode, setThemeId, setMode, resetToDefault } = useTheme();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<MeProfile>(apiPaths.me()),
  });
  const configQuery = useQuery({
    queryKey: queryKeys.publicConfig,
    queryFn: () => api<PublicConfig>(apiPaths.publicConfig()),
    staleTime: 60_000,
  });

  const allowUserThemes = configQuery.data?.appearance.allowUserThemes ?? true;
  const defaultTheme = configQuery.data?.appearance.defaultTheme ?? DEFAULT_THEME_ID;
  const usingDefault = meQuery.data?.themeId == null;

  const patchMe = useMutation({
    mutationFn: (body: { themeId?: string | null; themeMode?: ThemeMode }) =>
      api(apiPaths.me(), { method: 'PATCH', body }),
    onSuccess: (_d, vars) => {
      queryClient.setQueryData<MeProfile>(queryKeys.me, (old) => ({
        ...(old ?? ({} as MeProfile)),
        ...(vars.themeId !== undefined ? { themeId: vars.themeId } : {}),
        ...(vars.themeMode !== undefined ? { themeMode: vars.themeMode } : {}),
      }));
    },
    onError: (err) => {
      show({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    },
  });

  const saveMode = (next: ThemeMode) => {
    setMode(next);
    patchMe.mutate(
      { themeMode: next },
      {
        onSuccess: () => show({ title: 'Appearance saved', tone: 'success' }),
      },
    );
  };

  const saveTheme = (id: string) => {
    setThemeId(id);
    patchMe.mutate(
      { themeId: id },
      {
        onSuccess: () =>
          show({
            title: `Theme set to ${THEMES.find((t) => t.id === id)?.name ?? id}`,
            tone: 'success',
          }),
      },
    );
  };

  const reset = () => {
    resetToDefault();
    patchMe.mutate(
      { themeId: null },
      {
        onSuccess: () => show({ title: 'Back to the instance default', tone: 'success' }),
      },
    );
  };

  return (
    <div className="flex max-w-[840px] flex-col gap-6">
      <Card>
        <CardBody>
          <CardTitle>Mode</CardTitle>
          <div className="mt-4 flex flex-col gap-2">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => saveMode(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-4 rounded border p-4 text-left transition-[border-color] duration-120',
                    active
                      ? 'border-brand-blue bg-brand-blue-50'
                      : 'border-line bg-surface hover:border-line-strong',
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', active ? 'text-brand-blue' : 'text-ink-3')}
                    strokeWidth={2.25}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink">{opt.label}</span>
                    <span className="block text-[12.5px] text-ink-3">{opt.description}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 text-brand-blue" strokeWidth={2.25} /> : null}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {allowUserThemes ? (
        <Card>
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Theme</CardTitle>
                <p className="mt-1 text-[13px] text-ink-3">
                  Every theme ships a light and a dark palette. The wordmark, patterns, and
                  accents re-skin with it.
                </p>
              </div>
              <button
                onClick={() => reset()}
                disabled={usingDefault}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-120',
                  usingDefault
                    ? 'cursor-default border-line text-ink-4'
                    : 'border-line-strong text-ink-2 hover:border-brand-blue hover:text-brand-blue',
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
                {usingDefault ? 'Using instance default' : 'Use instance default'}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {THEMES.map((theme) => {
                const active = themeId === theme.id || (usingDefault && theme.id === defaultTheme);
                return (
                  <button
                    key={theme.id}
                    onClick={() => saveTheme(theme.id)}
                    aria-pressed={active}
                    className={cn(
                      'group relative rounded-lg border p-3 text-left transition-[border-color,box-shadow] duration-120',
                      active
                        ? 'border-brand-blue shadow-2 ring-1 ring-brand-blue'
                        : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    {themeId === theme.id ? (
                      <span className="absolute right-2.5 top-2.5 inline-grid h-5 w-5 place-items-center rounded-full bg-brand-blue-strong text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : null}
                    {usingDefault && theme.id === defaultTheme ? (
                      <span className="absolute right-2.5 top-2.5 rounded bg-brand-yellow-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-yellow-ink">
                        Default
                      </span>
                    ) : null}
                    <ThemePreview id={theme.id} />
                    <span className="mt-2.5 block text-[14px] font-medium text-ink">
                      {theme.name}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                      {theme.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <CardTitle>Theme</CardTitle>
            <p className="mt-2 text-[13.5px] text-ink-3">
              The instance administrator has locked the theme to the default. Your account
              uses {THEMES.find((t) => t.id === defaultTheme)?.name ?? defaultTheme} on this
              instance.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
