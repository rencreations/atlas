'use client';

import { useState } from 'react';
import { Copy, Fingerprint, LoaderCircle, Trash2 } from 'lucide-react';
import { CheckIcon } from '@/components/icons/animated/check';
import { KeyIcon } from '@/components/icons/animated/key-round';
import { PlusIcon } from '@/components/icons/animated/plus';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodeSsoConnection } from '@/lib/godmode/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const SSO_TYPE_LABELS: Record<string, string> = { oidc: 'OIDC', saml: 'SAML' };

interface SsoDraft {
  name: string;
  type: 'oidc' | 'saml';
  domains: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  entryPoint: string;
  spIssuer: string;
  cert: string;
  privateKey: string;
}

function emptyDraft(): SsoDraft {
  return {
    name: '',
    type: 'oidc',
    domains: '',
    issuer: '',
    clientId: '',
    clientSecret: '',
    entryPoint: '',
    spIssuer: '',
    cert: '',
    privateKey: '',
  };
}

/**
 * Tenant SSO directories. An instance can connect as many companies as it
 * wants, each with its own OIDC or SAML configuration; the login page
 * lists every enabled connection as its own button. Credentials for a
 * connection are encrypted at rest.
 */
export function SsoConnectionsPanel({
  connections,
  onChanged,
}: {
  connections: GodmodeSsoConnection[];
  onChanged?: () => void;
}) {
  const { show } = useToast();
  const confirm = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GodmodeSsoConnection | null>(null);
  const [draft, setDraft] = useState<SsoDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEdit = (conn: GodmodeSsoConnection) => {
    setEditing(conn);
    setDraft({
      name: conn.name,
      type: conn.type,
      domains: conn.domains.join(', '),
      issuer: conn.config.issuer ?? '',
      clientId: conn.config.clientId ?? '',
      clientSecret: '',
      entryPoint: conn.config.entryPoint ?? '',
      spIssuer: conn.config.spIssuer ?? '',
      cert: '',
      privateKey: '',
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const config: Record<string, string> =
        draft.type === 'oidc'
          ? { issuer: draft.issuer.trim(), clientId: draft.clientId.trim(), clientSecret: draft.clientSecret.trim() }
          : {
              entryPoint: draft.entryPoint.trim(),
              spIssuer: draft.spIssuer.trim(),
              cert: draft.cert.trim(),
              privateKey: draft.privateKey.trim(),
            };
      const payload = {
        name: draft.name.trim(),
        type: draft.type,
        enabled: editing?.enabled ?? false,
        domains: draft.domains.split(',').map((d) => d.trim()).filter(Boolean),
        config,
      };
      if (editing) {
        await godmodeFetch(godmodePaths.ssoConnection(editing.id), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        show({ title: 'Saved', description: `${draft.name.trim()} updated.`, tone: 'success' });
      } else {
        await godmodeFetch(godmodePaths.ssoConnections(), {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        show({ title: 'Added', description: `${draft.name.trim()} is ready to enable.`, tone: 'success' });
      }
      setDialogOpen(false);
      onChanged?.();
    } catch (err) {
      show({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (conn: GodmodeSsoConnection, enabled: boolean) => {
    setBusyId(conn.id);
    try {
      await godmodeFetch(godmodePaths.ssoConnectionEnabled(conn.id), {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      onChanged?.();
    } catch (err) {
      show({
        title: 'Could not update',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (conn: GodmodeSsoConnection) => {
    const ok = await confirm({
      title: `Delete ${conn.name}?`,
      description: 'People from this directory will lose that sign-in button. Their accounts stay intact.',
      confirmLabel: 'Delete connection',
    });
    if (!ok) return;
    try {
      await godmodeFetch(godmodePaths.ssoConnection(conn.id), { method: 'DELETE' });
      show({ title: 'Deleted', description: `${conn.name} removed.`, tone: 'success' });
      onChanged?.();
    } catch (err) {
      show({
        title: 'Could not delete',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    }
  };

  const copy = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    show({ title: 'Copied', description: label, tone: 'success' });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[560px] text-[13px] text-ink-3">
          Connect company directories (Okta, Entra ID, Google Workspace, and more) so each
          organization signs in with its own OIDC or SAML setup. Every enabled connection gets
          its own button on the login page.
        </p>
        <Button size="sm" variant="secondary" onClick={openCreate}>
          <PlusIcon size={16} className="flex items-center justify-center" />
          Add directory
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="rounded border border-line bg-surface p-8 text-center text-[14px] text-ink-3 shadow-1">
          No directories connected yet. Add one to let a company sign in with their own identity
          provider.
        </div>
      ) : null}

      {connections.map((conn) => {
        const Icon = conn.type === 'saml' ? Fingerprint : KeyIcon;
        const urlBase = conn.type === 'saml'
          ? `${API_BASE}/auth/sso/${conn.id}/saml/acs`
          : `${API_BASE}/auth/sso/${conn.id}/oidc/callback`;
        return (
          <div key={conn.id} className="rounded border border-line bg-surface p-4 shadow-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
                <Icon size={18} className="flex items-center justify-center" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-medium text-ink">{conn.name}</span>
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {SSO_TYPE_LABELS[conn.type] ?? conn.type}
                  </span>
                  {conn.domains.length > 0 ? (
                    <span className="text-[12px] text-ink-4">
                      domains: {conn.domains.join(', ')}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
                  <span className="shrink-0">
                    {conn.type === 'saml' ? 'ACS URL' : 'Callback URL'}
                  </span>
                  <code className="min-w-0 max-w-[420px] truncate font-mono text-[11px] text-ink-2">
                    {urlBase}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(urlBase, conn.type === 'saml' ? 'ACS URL copied.' : 'Callback URL copied.')}
                    className="inline-grid h-6 w-6 place-items-center rounded text-ink-3 transition-colors duration-120 hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    aria-label={`Copy ${conn.type === 'saml' ? 'ACS URL' : 'callback URL'} for ${conn.name}`}
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(conn)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void remove(conn)}
                  aria-label={`Delete ${conn.name}`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                </Button>
                <Switch
                  checked={conn.enabled}
                  onCheckedChange={(v) => void toggle(conn, v)}
                  disabled={busyId === conn.id}
                  aria-label={`${conn.name} sign-in`}
                />
              </div>
            </div>
          </div>
        );
      })}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg" className="w-[calc(100%-2rem)]">
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a company directory'}</DialogTitle>
          <DialogDescription>
            Choose how this organization signs in, then paste the details from their identity
            provider.
          </DialogDescription>
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink">Name</span>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Acme workspace"
                aria-label="Directory name"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink">Protocol</span>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v as 'oidc' | 'saml' }))}
              >
                <SelectTrigger className="w-[240px]" aria-label="Protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oidc">OIDC (OpenID Connect)</SelectItem>
                  <SelectItem value="saml">SAML 2.0</SelectItem>
                </SelectContent>
              </Select>
            </label>
            {draft.type === 'oidc' ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Issuer URL</span>
                  <Input
                    value={draft.issuer}
                    onChange={(e) => setDraft((d) => ({ ...d, issuer: e.target.value }))}
                    placeholder="https://your-org.okta.com"
                    aria-label="Issuer URL"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Client id</span>
                  <Input
                    value={draft.clientId}
                    onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value }))}
                    aria-label="Client id"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Client secret</span>
                  <Input
                    type="password"
                    value={draft.clientSecret}
                    onChange={(e) => setDraft((d) => ({ ...d, clientSecret: e.target.value }))}
                    autoComplete="new-password"
                    placeholder={editing?.config.secretSet?.clientSecret ? '•••••••• (set, leave blank to keep)' : 'Not set'}
                    aria-label="Client secret"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">IdP entry point</span>
                  <Input
                    value={draft.entryPoint}
                    onChange={(e) => setDraft((d) => ({ ...d, entryPoint: e.target.value }))}
                    placeholder="https://acme.okta.com/app/atlas/.../sso/saml"
                    aria-label="IdP entry point"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">SP entity id (optional)</span>
                  <Input
                    value={draft.spIssuer}
                    onChange={(e) => setDraft((d) => ({ ...d, spIssuer: e.target.value }))}
                    placeholder="Leave empty to use the instance URL"
                    aria-label="SP entity id"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">IdP certificate</span>
                  <Textarea
                    value={draft.cert}
                    onChange={(e) => setDraft((d) => ({ ...d, cert: e.target.value }))}
                    rows={4}
                    className="font-mono text-[12px]"
                    placeholder="Paste the X.509 certificate (PEM), or leave the box to keep the stored one"
                    aria-label="IdP certificate"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink">Signing private key (optional)</span>
                  <Textarea
                    value={draft.privateKey}
                    onChange={(e) => setDraft((d) => ({ ...d, privateKey: e.target.value }))}
                    rows={4}
                    className="font-mono text-[12px]"
                    placeholder="Only if your IdP expects signed requests"
                    aria-label="Signing private key"
                  />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink">Email domains (optional)</span>
              <Input
                value={draft.domains}
                onChange={(e) => setDraft((d) => ({ ...d, domains: e.target.value }))}
                placeholder="acme.com, acme.co.id"
                aria-label="Email domains"
              />
              <span className="text-[12px] text-ink-4">
                Comma separated. When someone types a matching email on the login page, this
                directory is highlighted.
              </span>
            </label>
          </div>
          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" onClick={() => void submit()} disabled={saving}>
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
              ) : (
                <CheckIcon size={16} className="flex items-center justify-center" />
              )}
              {editing ? 'Save' : 'Add directory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
