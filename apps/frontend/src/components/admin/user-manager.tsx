'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  KeyRound,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/components/ui/confirm';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { PasswordInput } from '@/components/auth/password-input';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { formatRelative } from '@/lib/utils';
import type { Paginated } from '@/lib/types';

interface AdminUserRole {
  code: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  suspendedAt: string | null;
  roles: AdminUserRole[];
}

interface InstanceRole {
  id: string;
  code: string;
  name: string;
}

const PAGE_SIZE = 24;

// Granting/revoking these through the role picker is redundant with (and
// less careful than) the dedicated Make/Revoke admin button below, so they
// render as read-only badges here rather than assignable options.
const PROTECTED_ROLE_CODES = new Set(['admin', 'superadmin']);

/** Page numbers to render, keeping the current page centered. */
function pageNumbers(totalPages: number, page: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = Math.max(2, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  return [1, ...Array.from({ length: end - start + 1 }, (_, i) => start + i), totalPages];
}

export function UserManager() {
  const qc = useQueryClient();
  const { show } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [resetTarget, setResetTarget] = React.useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = React.useState('');

  const list = useQuery({
    queryKey: ['users', 'admin', search, page],
    queryFn: () => api<Paginated<AdminUser>>(apiPaths.adminUsers(search, page, PAGE_SIZE)),
  });

  const roles = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => api<InstanceRole[]>(apiPaths.instanceRoles()),
  });
  const assignableRoles = (roles.data ?? []).filter((r) => !PROTECTED_ROLE_CODES.has(r.code));

  const totalPages = list.data?.meta.totalPages ?? 1;
  const items = list.data?.items ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  const onError = (title: string) => (err: unknown) =>
    show({ tone: 'danger', title, description: (err as Error).message });

  const setAdmin = useMutation({
    mutationFn: (vars: { id: string; isAdmin: boolean }) =>
      api(apiPaths.setAdmin(vars.id), { method: 'PATCH', body: { isAdmin: vars.isAdmin } }),
    onSuccess: (_, vars) => {
      invalidate();
      show({ tone: 'success', title: vars.isAdmin ? 'Admin role granted' : 'Admin role revoked' });
    },
    onError: onError('Action failed'),
  });

  const grantRole = useMutation({
    mutationFn: (vars: { id: string; roleCode: string }) =>
      api(apiPaths.grantUserRole(vars.id), { method: 'POST', body: { roleCode: vars.roleCode } }),
    onSuccess: () => {
      invalidate();
      show({ tone: 'success', title: 'Role granted' });
    },
    onError: onError('Could not grant role'),
  });

  const revokeRole = useMutation({
    mutationFn: (vars: { id: string; roleCode: string }) =>
      api(apiPaths.revokeUserRole(vars.id, vars.roleCode), { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      show({ tone: 'success', title: 'Role revoked' });
    },
    onError: onError('Could not revoke role'),
  });

  const suspend = useMutation({
    mutationFn: (id: string) => api(apiPaths.suspendUser(id), { method: 'POST', body: {} }),
    onSuccess: () => {
      invalidate();
      show({ tone: 'success', title: 'User suspended' });
    },
    onError: onError('Could not suspend user'),
  });

  const unsuspend = useMutation({
    mutationFn: (id: string) => api(apiPaths.unsuspendUser(id), { method: 'POST' }),
    onSuccess: () => {
      invalidate();
      show({ tone: 'success', title: 'User unsuspended' });
    },
    onError: onError('Could not unsuspend user'),
  });

  const revokeSessions = useMutation({
    mutationFn: (id: string) => api(apiPaths.revokeUserSessions(id), { method: 'POST' }),
    onSuccess: () => show({ tone: 'success', title: 'Sessions revoked' }),
    onError: onError('Could not revoke sessions'),
  });

  const resetPassword = useMutation({
    mutationFn: (vars: { id: string; newPassword: string }) =>
      api(apiPaths.adminResetPassword(vars.id), {
        method: 'POST',
        body: { newPassword: vars.newPassword },
      }),
    onSuccess: () => {
      setResetTarget(null);
      setNewPassword('');
      show({ tone: 'success', title: 'Password reset' });
    },
    onError: onError('Could not reset password'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api(apiPaths.deleteUser(id), { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      show({ tone: 'success', title: 'User deleted' });
    },
    onError: onError('Could not delete user'),
  });

  const onSuspend = async (u: AdminUser) => {
    const ok = await confirm({
      title: `Suspend ${u.name}?`,
      description: 'They are signed out everywhere and can’t log back in until unsuspended.',
      confirmLabel: 'Suspend user',
    });
    if (ok) suspend.mutate(u.id);
  };

  const onDelete = async (u: AdminUser) => {
    const ok = await confirm({
      title: `Delete ${u.name}?`,
      description:
        'This permanently removes their account. Content they own is reassigned to a superadmin. This cannot be undone.',
      confirmLabel: 'Delete user',
    });
    if (ok) deleteUser.mutate(u.id);
  };

  const closeResetDialog = () => {
    setResetTarget(null);
    setNewPassword('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-h2 tracking-[-0.01em] text-ink">Users</h2>
          <p className="mt-1 text-body-sm text-ink-2">
            {list.data?.meta.total ?? '0'} authenticated members.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={search}
            placeholder="Search by name or email"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {list.isError ? (
        <ErrorState
          title="Couldn't load users"
          message="Something went wrong while fetching the member list."
          onRetry={() => void list.refetch()}
        />
      ) : list.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No users found"
          description={
            search
              ? `Nothing matches “${search}”. Try a different name or email.`
              : 'No authenticated members yet. Invite someone or wait for the first sign-in.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="bg-surface-muted text-[12px] uppercase tracking-[0.05em] text-ink-3">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Member</th>
                  <th className="px-5 py-3 text-left font-medium">Roles</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Joined</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((u) => {
                  const unassigned = assignableRoles.filter(
                    (r) => !u.roles.some((ur) => ur.code === r.code),
                  );
                  return (
                    <tr key={u.id} className="hover:bg-surface-muted/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatarUrl} name={u.name} size={32} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-ink">{u.name}</div>
                            <div className="truncate text-[12px] text-ink-3">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {u.roles.length === 0 ? (
                            <span className="text-[12px] text-ink-4">No roles</span>
                          ) : (
                            u.roles.map((r) => {
                              const protected_ = PROTECTED_ROLE_CODES.has(r.code);
                              return (
                                <Badge
                                  key={r.code}
                                  tone={protected_ ? 'info' : 'neutral'}
                                  className="gap-1"
                                >
                                  {r.name}
                                  {!protected_ ? (
                                    <button
                                      type="button"
                                      aria-label={`Remove ${r.name} role from ${u.name}`}
                                      onClick={() =>
                                        revokeRole.mutate({ id: u.id, roleCode: r.code })
                                      }
                                      className="rounded-full hover:bg-ink/10"
                                    >
                                      <X className="h-3 w-3" strokeWidth={2.5} />
                                    </button>
                                  ) : null}
                                </Badge>
                              );
                            })
                          )}
                          {unassigned.length > 0 ? (
                            <Select
                              value=""
                              onValueChange={(v) => grantRole.mutate({ id: u.id, roleCode: v })}
                            >
                              <SelectTrigger
                                aria-label={`Add a role to ${u.name}`}
                                className="h-6 w-auto gap-1 rounded-full border-dashed px-2 text-[12px] text-ink-3 hover:border-line-strong"
                              >
                                <SelectValue placeholder="+ Role" />
                              </SelectTrigger>
                              <SelectContent>
                                {unassigned.map((r) => (
                                  <SelectItem key={r.id} value={r.code}>
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {u.suspendedAt ? (
                          <Badge tone="danger">Suspended</Badge>
                        ) : (
                          <Badge tone="success">Active</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-3">{formatRelative(u.createdAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.isAdmin ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAdmin.mutate({ id: u.id, isAdmin: false })}
                              loading={setAdmin.isPending && setAdmin.variables?.id === u.id}
                            >
                              <ShieldOff className="h-3.5 w-3.5" strokeWidth={2.25} />
                              Revoke admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setAdmin.mutate({ id: u.id, isAdmin: true })}
                              loading={setAdmin.isPending && setAdmin.variables?.id === u.id}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
                              Make admin
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`More actions for ${u.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" strokeWidth={2.25} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setResetTarget(u)}>
                                <KeyRound className="h-3.5 w-3.5" strokeWidth={2.25} />
                                Reset password
                              </DropdownMenuItem>
                              {u.suspendedAt ? (
                                <DropdownMenuItem onSelect={() => unsuspend.mutate(u.id)}>
                                  <CircleSlash className="h-3.5 w-3.5" strokeWidth={2.25} />
                                  Unsuspend
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => void onSuspend(u)}>
                                  <Ban className="h-3.5 w-3.5" strokeWidth={2.25} />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => revokeSessions.mutate(u.id)}>
                                <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
                                Revoke sessions
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => void onDelete(u)}
                                className="text-brand-red"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                                Delete user
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            <p className="text-[12px] text-ink-3">
              {list.data?.meta.total ?? 0} member{list.data?.meta.total === 1 ? '' : 's'} · page{' '}
              {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page <= 1 || list.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
              </Button>
              {pageNumbers(totalPages, page).map((n, i, arr) => (
                <React.Fragment key={n}>
                  {i > 0 && arr[i - 1] !== n - 1 ? (
                    <span className="px-1 text-[12px] text-ink-4">…</span>
                  ) : null}
                  <Button
                    variant={n === page ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    aria-label={`Page ${n}`}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                </React.Fragment>
              ))}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next page"
                disabled={page >= totalPages || list.isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={Boolean(resetTarget)} onOpenChange={(o) => !o && closeResetDialog()}>
        <DialogContent size="sm">
          <DialogTitle>Reset {resetTarget?.name}&apos;s password</DialogTitle>
          <DialogDescription>
            They&apos;ll be signed out everywhere and asked to set a new password on next login.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (resetTarget) resetPassword.mutate({ id: resetTarget.id, newPassword });
            }}
          >
            <div className="mt-4">
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                data-bwignore="true"
                data-form-type="other"
                aria-label="New password"
                autoFocus
              />
            </div>
            <DialogFooter className="mt-5">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={resetPassword.isPending || newPassword.length < 6}>
                {resetPassword.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.25} />
                ) : (
                  <KeyRound className="h-4 w-4" strokeWidth={2.25} />
                )}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
