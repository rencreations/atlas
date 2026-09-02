'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Plus, Ticket, Trash2, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { godmodeFetch, godmodePaths } from '@/lib/godmode/client';
import type { GodmodeRole, GodmodeUser } from '@/lib/godmode/types';

export function UsersPanel({ configured = true }: { configured?: boolean }) {
  const { show } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<GodmodeUser[]>([]);
  const [roles, setRoles] = useState<GodmodeRole[]>([]);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Debounce the search input (~300ms) so the users API isn't hit per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        godmodeFetch<GodmodeUser[]>(godmodePaths.users(debouncedQ)),
        godmodeFetch<GodmodeRole[]>(godmodePaths.roles()),
      ]);
      setUsers(u);
      setRoles(r);
    } catch (err) {
      show({
          title: 'Could not load users',
          description: err instanceof Error ? err.message : 'Unknown error.',
          tone: 'danger',
        });
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, show]);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = useCallback(
    async (data: { email: string; name: string; password: string; roleCode: string }) => {
      try {
        await godmodeFetch(godmodePaths.createUser(), {
          method: 'POST',
          body: JSON.stringify(data),
        });
        setCreating(false);
        show({ title: 'User created', description: data.email, tone: 'success' });
        void load();
      } catch (err) {
        show({
          title: 'Create failed',
          description: err instanceof Error ? err.message : 'Unknown error.',
          tone: 'danger',
        });
      }
    },
    [load, show],
  );

  const toggleRole = useCallback(
    async (user: GodmodeUser, roleCode: string) => {
      const has = user.userRoles.some((ur) => ur.role.code === roleCode);
      if (has) {
        const ok = await confirm({
          title: `Revoke “${roleCode}” from ${user.name}?`,
          description:
            roleCode === 'superadmin'
              ? 'They lose full control of this instance, including godmode-granted permissions. You can grant it again later.'
              : 'They lose every permission this role grants. You can grant it again later.',
          confirmLabel: 'Revoke role',
        });
        if (!ok) return;
      }
      try {
        if (has) {
          await godmodeFetch(godmodePaths.revokeRole(user.id, roleCode), { method: 'DELETE' });
        } else {
          await godmodeFetch(godmodePaths.grantRole(user.id), {
            method: 'POST',
            body: JSON.stringify({ roleCode }),
          });
        }
        void load();
      } catch (err) {
        show({
          title: 'Role change failed',
          description: err instanceof Error ? err.message : 'Unknown error.',
          tone: 'danger',
        });
      }
    },
    [confirm, load, show],
  );

  const issueInvite = useCallback(async () => {
    try {
      const res = await godmodeFetch<{ code: string }>(godmodePaths.invites(), {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setInviteCode(res.code);
    } catch (err) {
      show({
        title: 'Could not create an invite',
        description: err instanceof Error ? err.message : 'Unknown error.',
        tone: 'danger',
      });
    }
  }, [show]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="w-[280px]"
          placeholder="Search users…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void issueInvite()}>
            <Ticket className="h-4 w-4" strokeWidth={2.25} />
            Issue invite code
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" strokeWidth={2.25} />
            Add user
          </Button>
        </div>
      </div>

      {inviteCode ? (
        <div className="rounded border border-brand-yellow bg-brand-yellow-50 px-4 py-3 text-[13px]">
          Invite code{' '}
          <span className="select-all font-mono text-[13px] font-semibold text-brand-yellow-ink">
            {inviteCode}
          </span>{' '}
         , valid for 7 days.
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoaderCircle className="h-6 w-6 animate-spin text-ink-3" strokeWidth={2.25} />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded border border-line bg-surface p-10 text-center text-[14px] text-ink-3 shadow-1">
          No users found{debouncedQ ? ` for “${debouncedQ}”` : ' yet'}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 rounded border border-line bg-surface p-3 shadow-1"
            >
              <Avatar src={user.avatarUrl ?? undefined} name={user.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-ink">{user.name}</span>
                  {user.isAdmin ? <Badge tone="info">admin</Badge> : null}
                  {user.userRoles
                    .filter((ur) => ur.role.code !== 'member')
                    .map((ur) => (
                      <Badge
                        key={ur.id}
                        tone={
                          ur.role.code === 'superadmin'
                            ? 'danger'
                            : ur.role.code === 'admin'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {ur.role.code}
                      </Badge>
                    ))}
                </div>
                <div className="truncate text-[12px] text-ink-3">{user.email}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <GrantRoleMenu
                  roles={roles.filter(
                    (r) => !user.userRoles.some((ur) => ur.role.code === r.code),
                  )}
                  onGrant={(code) => void toggleRole(user, code)}
                />
                {user.userRoles.map((ur) => (
                  <Button
                    key={ur.id}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${ur.role.code} role`}
                    onClick={() => void toggleRole(user, ur.role.code)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-brand-red" strokeWidth={2.25} />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <CreateUserDialog
          configured={configured}
          roles={roles}
          onClose={() => setCreating(false)}
          onSubmit={(data) => void createUser(data)}
        />
      ) : null}
    </div>
  );
}

/**
 * Grant menu for the roles a user does not have yet. This used to render
 * the first three grantable roles as inline buttons, which made the
 * remaining roles impossible to grant from the UI once a user held three.
 */
function GrantRoleMenu({
  roles,
  onGrant,
}: {
  roles: GodmodeRole[];
  onGrant: (roleCode: string) => void;
}) {
  if (roles.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          Grant role
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Grant a role</DropdownMenuLabel>
        {roles.map((role) => (
          <DropdownMenuItem key={role.id} onSelect={() => onGrant(role.code)}>
            {role.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateUserDialog({
  configured,
  roles,
  onClose,
  onSubmit,
}: {
  /** Before onboarding completes the backend forces the first account to
   *  superadmin and skips the forced password change. */
  configured: boolean;
  roles: GodmodeRole[];
  onClose: () => void;
  onSubmit: (data: { email: string; name: string; password: string; roleCode: string }) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState('member');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogTitle>{configured ? 'Add user' : 'Create the superadmin account'}</DialogTitle>
        <DialogDescription>
          {configured
            ? 'Creates an account they sign into with email + password. Whether they must change it on first login follows the Sessions policy.'
            : 'This first account owns the instance: it is always created as superadmin, with the password you set here and no forced change on first login.'}
        </DialogDescription>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu-name">Name</Label>
            <Input id="cu-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu-pass">Initial password</Label>
            <Input
              id="cu-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div className={configured ? 'flex flex-col gap-1.5' : 'hidden'}>
            <Label htmlFor="cu-role">Role</Label>
            <Select value={roleCode} onValueChange={setRoleCode}>
              <SelectTrigger id="cu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.code}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!email || !name || password.length < 6}
            onClick={() =>
              onSubmit({ email, name, password, roleCode: configured ? roleCode : 'superadmin' })
            }
          >
            {configured ? 'Create user' : 'Create superadmin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
