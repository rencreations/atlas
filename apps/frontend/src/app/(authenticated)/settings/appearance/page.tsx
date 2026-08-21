'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useTheme, type ThemePreference } from '@/lib/theme';

const OPTIONS: { value: ThemePreference; label: string; description: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { value: 'light', label: 'Light', description: 'The default Atlas palette.', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Easier on the eyes in low light.', icon: Moon },
  { value: 'system', label: 'System', description: 'Follows your device setting.', icon: Monitor },
];

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { show } = useToast();
  const queryClient = useQueryClient();
  useQuery({ queryKey: queryKeys.me, queryFn: () => api(apiPaths.me()) });

  const save = useMutation({
    mutationFn: (next: ThemePreference) =>
      api(apiPaths.me(), { method: 'PATCH', body: { theme: next } }),
    onSuccess: (_d, next) => {
      queryClient.setQueryData<Record<string, unknown>>(queryKeys.me, (old) => ({
        ...(old ?? {}),
        theme: next,
      }));
      setTheme(next);
      show({ title: 'Appearance saved', tone: 'success' });
    },
    onError: (err) => {
      show({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    },
  });

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <Card>
        <CardBody>
          <CardTitle>Theme</CardTitle>
          <div className="mt-4 flex flex-col gap-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => save.mutate(opt.value)}
                  className={`flex items-center gap-4 rounded border p-4 text-left transition-[border-color] duration-120 ${
                    active ? 'border-brand-blue bg-brand-blue-50' : 'border-line bg-white hover:border-line-strong'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-brand-blue' : 'text-ink-3'}`} strokeWidth={2.25} />
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
    </div>
  );
}
