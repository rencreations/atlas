'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { formatRelative } from '@/lib/utils';
import type { Paginated } from '@/lib/types';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
}

const PAGE_SIZE = 24;

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
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);

  const list = useQuery({
    queryKey: ['users', 'admin', search, page],
    queryFn: () =>
      api<Paginated<AdminUser>>(
        `/users?q=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`,
      ),
  });

  const totalPages = list.data?.meta.totalPages ?? 1;
  const items = list.data?.items ?? [];

  const setAdmin = useMutation({
    mutationFn: (vars: { id: string; isAdmin: boolean }) =>
      api(apiPaths.setAdmin(vars.id), { method: 'PATCH', body: { isAdmin: vars.isAdmin } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      show({
        tone: 'success',
        title: vars.isAdmin ? 'Admin role granted' : 'Admin role revoked',
      });
    },
    onError: (err) =>
      show({ tone: 'danger', title: 'Action failed', description: (err as Error).message }),
  });

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
          <table className="w-full text-[14px]">
            <thead className="bg-surface-muted text-[12px] uppercase tracking-[0.05em] text-ink-3">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Member</th>
                <th className="px-5 py-3 text-left font-medium">Role</th>
                <th className="px-5 py-3 text-left font-medium">Joined</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((u) => (
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
                    {u.isAdmin ? <Badge tone="info">Admin</Badge> : <Badge tone="neutral">Member</Badge>}
                  </td>
                  <td className="px-5 py-3 text-ink-3">{formatRelative(u.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
    </div>
  );
}

// Fallback path for kanban drag reorder latency when the primary is unavailable

// See the incident notes for contribution request review queue before changing defaults
