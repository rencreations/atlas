'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, LoaderCircle } from 'lucide-react';
import { BoxIcon } from '@/components/icons/animated/box';
import { CloudIcon } from '@/components/icons/animated/cloud';
import { CloudCogIcon } from '@/components/icons/animated/cloud-cog';
import { HardDriveIcon } from '@/components/icons/animated/hard-drive';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodeSettingItem, GodmodeStorageMigration } from '@/lib/godmode/types';
import { ProviderChoicePanel, type ProviderCardOption } from './provider-choice-panel';
import { SettingRow, type EditorValue } from './setting-row';

const STORAGE_PROVIDER_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  local: HardDriveIcon,
  s3: CloudIcon,
  r2: CloudCogIcon,
  s3compat: BoxIcon,
  disabled: Ban,
};

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    local: 'server local storage',
    s3: 'AWS S3',
    r2: 'Cloudflare R2',
    s3compat: 'S3-compatible storage',
    disabled: 'disabled storage',
  };
  return labels[provider] ?? provider;
}

/**
 * Storage settings with the provider as cards (icons, one active at a
 * time) and the migration flow. Switching providers never applies
 * instantly: the save triggers a background copy of every stored object,
 * and the active provider only flips when the copy finishes cleanly.
 * Progress, failures, and the retry button render above the cards.
 */
export function StoragePanel({
  items,
  values,
  onChange,
  onSaved,
  saveTick,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
  onSaved?: () => void;
  /** Bumped by the editor after each successful save (re-poll migration). */
  saveTick: number;
}) {
  const { show } = useToast();
  const [migration, setMigration] = useState<GodmodeStorageMigration | null | undefined>(
    undefined,
  );
  const migrationRef = useRef<GodmodeStorageMigration | null | undefined>(undefined);

  const poll = useCallback(async () => {
    try {
      const m = await godmodeFetch<GodmodeStorageMigration | null>(
        godmodePaths.storageMigration(),
      );
      const prev = migrationRef.current;
      migrationRef.current = m;
      setMigration(m);
      if (prev && prev.status === 'RUNNING' && m && m.status === 'COMPLETED') {
        // The provider just flipped server-side; refresh the settings view.
        onSaved?.();
      }
    } catch {
      // Unlock expiry or network hiccup; the next poll retries.
    }
  }, [onSaved]);

  useEffect(() => {
    void poll();
  }, [poll, saveTick]);

  useEffect(() => {
    if (migration?.status === 'RUNNING') {
      const timer = setInterval(() => void poll(), 3000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [migration?.status, poll]);

  const providerItem = items.find((i) => i.key === 'storage.provider');
  const { options, rest } = useMemo(() => {
    const byProvider = new Map<string, GodmodeSettingItem[]>();
    const leftover: GodmodeSettingItem[] = [];
    for (const item of items) {
      if (item.key === 'storage.provider') continue;
      const dep = item.visibleWhen?.key === 'storage.provider' ? item.visibleWhen.oneOf[0] : undefined;
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
      label: o.label,
      icon: STORAGE_PROVIDER_ICONS[o.value],
      fields: byProvider.get(o.value) ?? [],
    }));
    return { options: opts, rest: leftover };
  }, [items, providerItem]);

  const retry = async () => {
    try {
      await godmodeFetch(godmodePaths.storageMigrationRetry(), { method: 'POST' });
      void poll();
    } catch (err) {
      show({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    }
  };

  if (!providerItem) return null;

  return (
    <div className="flex flex-col gap-4">
      {migration && migration.status === 'RUNNING' ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded border border-brand-blue/30 bg-brand-blue-50 px-4 py-3 text-[13px]"
        >
          <LoaderCircle className="h-4 w-4 animate-spin text-brand-blue" strokeWidth={2.25} />
          <span className="text-ink">
            Migrating files from {providerLabel(migration.fromProvider)} to{' '}
            {providerLabel(migration.toProvider)}
          </span>
          <span className="ml-auto tabular-nums text-ink-2">
            {migration.transferredCount} of {migration.objectCount} objects
            {migration.objectCount > 0
              ? ` (${Math.min(100, Math.round((migration.transferredCount / migration.objectCount) * 100))}%)`
              : ''}
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-blue-strong transition-[width] duration-320"
              style={{
                width: `${migration.objectCount > 0 ? (migration.transferredCount / migration.objectCount) * 100 : 100}%`,
              }}
            />
          </div>
          <p className="w-full text-[12px] text-ink-3">
            Uploads keep working through the current provider while files copy. The switch
            completes on its own when every object is on the new provider.
          </p>
        </div>
      ) : null}
      {migration && (migration.status === 'FAILED' || migration.status === 'INTERRUPTED') ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-[13px]"
        >
          <span className="font-medium text-brand-red">
            {migration.status === 'INTERRUPTED' ? 'Migration was interrupted' : 'Migration failed'}
          </span>
          <span className="min-w-0 flex-1 text-ink-2">
            {migration.error ?? `From ${providerLabel(migration.fromProvider)} to ${providerLabel(migration.toProvider)}.`}{' '}
            The active provider was left unchanged, your files are safe.
          </span>
          <Button variant="secondary" size="sm" onClick={() => void retry()}>
            Retry
          </Button>
        </div>
      ) : null}

      <ProviderChoicePanel
        intro={providerItem.description}
        providerItem={providerItem}
        options={options}
        values={values}
        onChange={onChange}
      />
      {rest.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rest.map((field) => {
            const entry = values[field.key];
            if (!entry) return null;
            return (
              <SettingRow
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
}
