'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { ChevronDownIcon } from '@/components/icons/animated/chevron-down';
import { ExternalLinkIcon } from '@/components/icons/animated/external-link';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { OAUTH_PROVIDER_LOGOS } from '../oauth-logos';
import { InlineFieldRow, type EditorValue } from './setting-row';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

interface ProviderGroup {
  id: string;
  label: string;
  docUrl?: string;
  enabledKey: string;
  fields: GodmodeSettingItem[];
}

/**
 * The OAuth group renders as a list of providers, one card each. The card
 * shows the brand logo and a switch; clicking anywhere on the header
 * expands the configuration. Each provider links to its official setup
 * guide and shows the exact callback URL to register there. Disabled
 * providers keep their saved credentials, so re-enabling never asks for
 * them again.
 */
export function OAuthProvidersPanel({
  items,
  values,
  onChange,
}: {
  items: GodmodeSettingItem[];
  values: Record<string, EditorValue>;
  onChange: (key: string, value: EditorValue['value']) => void;
}) {
  const { show } = useToast();
  const [callbacks, setCallbacks] = useState<Record<string, string>>({});

  // Callback URLs come from a public endpoint, no godmode token needed.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/auth/oauth-callbacks`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setCallbacks(data as Record<string, string>);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const providers = useMemo(() => {
    const map = new Map<string, ProviderGroup>();
    for (const item of items) {
      const match = item.key.match(/^auth\.oauth\.([^.]+)\.([^.]+)$/);
      if (!match) continue;
      const [, id, field] = match;
      if (!map.has(id)) {
        map.set(id, { id, label: id, enabledKey: '', fields: [] });
      }
      const group = map.get(id)!;
      if (field === 'enabled') {
        group.enabledKey = item.key;
        group.label = item.label.replace(/\s+sign-in$/i, '');
        group.docUrl = item.docUrl;
      } else {
        group.fields.push(item);
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    show({ title: 'Copied', description: label, tone: 'success' });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-3">
        Turn on the providers you want on the login page. Each provider keeps its credentials
        when switched off.
      </p>
      {providers.map((provider) => {
        const enabled = values[provider.enabledKey]?.value === true;
        const Logo = OAUTH_PROVIDER_LOGOS[provider.id];
        const expanded = openOverrides[provider.id] ?? enabled;
        const callback = callbacks[provider.id];
        return (
          <div key={provider.id} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex items-center gap-3">
              {/* The whole header toggles the configuration, not just the chevron. */}
              <button
                type="button"
                onClick={() =>
                  setOpenOverrides((prev) => ({ ...prev, [provider.id]: !expanded }))
                }
                aria-expanded={expanded}
                aria-label={`Show ${provider.label} configuration`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                  {Logo ? <Logo className="h-5 w-5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{provider.label}</span>
                </span>
                <ChevronDownIcon
                  size={16}
                  className={cn('flex shrink-0 items-center justify-center text-ink-3 transition-transform duration-200', expanded && 'rotate-180')}
                />
              </button>
              {provider.docUrl ? (
                <a
                  href={provider.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded text-[12px] font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Setup guide
                  <ExternalLinkIcon size={12} className="flex items-center justify-center" />
                </a>
              ) : null}
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  onChange(provider.enabledKey, v);
                  // Reveal the fields when turning on; hide them when turning off.
                  setOpenOverrides((prev) => ({ ...prev, [provider.id]: Boolean(v) }));
                }}
                aria-label={`${provider.label} sign-in`}
              />
            </div>
            {expanded ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 pl-12">
                {callback ? (
                  <div className="flex flex-wrap items-center gap-2 rounded bg-surface-muted px-3 py-2">
                    <span className="text-[12px] text-ink-3">Callback URL</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-2">
                      {callback}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(callback, 'Callback URL copied.')}
                      className="inline-grid h-6 w-6 place-items-center rounded text-ink-3 transition-colors duration-120 hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      aria-label="Copy callback URL"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </button>
                  </div>
                ) : null}
                {provider.fields.length > 0 && !enabled ? (
                  <p className="text-[12px] text-ink-4">
                    Saved credentials stay here while the provider is off.
                  </p>
                ) : null}
                {provider.fields.map((field) => {
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
