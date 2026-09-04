'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText, FolderOpen, Hash, ListTodo, Loader2, Palette, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { queryKeys } from '@/lib/api/queries';
import { searchHitHref } from '@/lib/chat/scope';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SnippetHTML } from '@/components/chat/chat-search';
import type {
  ChatSearchHit,
  FileSearchHit,
  GlobalSearchResponse,
  NoteSearchHit,
  ProjectSearchHit,
  TaskSearchHit,
  WhiteboardSearchHit,
} from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** A project's own notes/files/whiteboards route, or the project page if it has no task list yet. */
function pmoHref(slug: string, listId: string | null, rest: string): string {
  return listId ? `/projects/${slug}/lists/${listId}/${rest}` : `/projects/${slug}`;
}

/**
 * Cross-content search: projects, chat, and (when PMO is on) tasks,
 * docs, files, and whiteboards across every project the caller can
 * read. Opened from the header's search trigger or ⌘K.
 */
export function GlobalSearch({ open, onOpenChange }: Props) {
  const [q, setQ] = React.useState('');
  const debounced = useDebounced(q, 250);

  React.useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const query = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: () => api<GlobalSearchResponse>(apiPaths.search({ q: debounced.trim(), limit: 8 })),
    enabled: open && debounced.trim().length >= 2,
    staleTime: 10_000,
  });

  const data = query.data;
  const hasResults =
    data &&
    (data.projects.length ||
      data.chat.length ||
      data.tasks.length ||
      data.notes.length ||
      data.files.length ||
      data.whiteboards.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[80vh] overflow-hidden p-0">
        {/* Reserve room on the right for the Dialog's built-in close (h-8 w-8 at right-3 top-3). */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 pr-14">
          <Search className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, chat, tasks, docs, files, whiteboards…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {debounced.trim().length < 2 ? (
            <div className="px-3 py-6 text-center text-[13px] text-ink-3">
              Type at least 2 characters to search everything you have access to.
            </div>
          ) : query.isLoading ? (
            <div className="grid h-32 place-items-center text-ink-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : query.isError ? (
            <div className="px-3 py-6 text-center text-[13px] text-brand-red">
              Search failed. Check your connection and try again.
            </div>
          ) : !hasResults ? (
            <div className="px-3 py-6 text-center text-[13px] text-ink-3">
              No matches for &ldquo;{debounced}&rdquo;.
            </div>
          ) : (
            <div className="space-y-3">
              <ProjectSection hits={data!.projects} onPick={() => onOpenChange(false)} />
              <ChatSection hits={data!.chat} onPick={() => onOpenChange(false)} />
              <TaskSection hits={data!.tasks} onPick={() => onOpenChange(false)} />
              <NoteSection hits={data!.notes} onPick={() => onOpenChange(false)} />
              <FileSection hits={data!.files} onPick={() => onOpenChange(false)} />
              <WhiteboardSection hits={data!.whiteboards} onPick={() => onOpenChange(false)} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function HitRow({
  href,
  onPick,
  icon,
  title,
  subtitle,
  eyebrow,
}: {
  href: string;
  onPick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Small mono tag shown before the subtitle, e.g. a task key. */
  eyebrow?: string;
}) {
  return (
    <li>
      <Link
        href={href as never}
        onClick={onPick}
        className="flex items-center gap-2.5 rounded px-3 py-2 transition-colors hover:bg-surface-muted/60"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-surface-muted text-ink-3">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] text-ink">{title}</div>
          {subtitle || eyebrow ? (
            <div className="flex items-center gap-1.5 truncate text-[11px] text-ink-3">
              {eyebrow ? <code className="font-mono">{eyebrow}</code> : null}
              {subtitle ? <span className="truncate">{subtitle}</span> : null}
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function ProjectSection({ hits, onPick }: { hits: ProjectSearchHit[]; onPick: () => void }) {
  if (hits.length === 0) return null;
  return (
    <SectionShell label="Projects">
      {hits.map((p) => (
        <HitRow
          key={p.id}
          href={`/projects/${p.slug}`}
          onPick={onPick}
          icon={
            p.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumbnailUrl} alt="" className="h-full w-full rounded object-cover" />
            ) : (
              <Hash className="h-3.5 w-3.5" strokeWidth={2.25} />
            )
          }
          title={p.title}
        />
      ))}
    </SectionShell>
  );
}

function ChatSection({ hits, onPick }: { hits: ChatSearchHit[]; onPick: () => void }) {
  if (hits.length === 0) return null;
  return (
    <SectionShell label="Chat">
      <ul className="space-y-1">
        {hits.map((h) => (
          <li key={h.id}>
            <Link
              href={`${searchHitHref(h.projectSlug, h.channelId)}?msg=${h.id}` as never}
              onClick={onPick}
              className="block rounded px-3 py-2 transition-colors hover:bg-surface-muted/60"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                <Hash className="h-3 w-3" strokeWidth={2.25} />
                <span className="truncate">{h.channelName}</span>
                <span>·</span>
                <span className="truncate">{h.authorName}</span>
              </div>
              <SnippetHTML html={h.snippet} className="mt-0.5 text-[13px] text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

function TaskSection({ hits, onPick }: { hits: TaskSearchHit[]; onPick: () => void }) {
  if (hits.length === 0) return null;
  return (
    <SectionShell label="Tasks">
      {hits.map((t) => (
        <HitRow
          key={t.id}
          href={`/projects/${t.projectSlug}/lists/${t.taskListId}/tasks/${t.key}`}
          onPick={onPick}
          icon={<ListTodo className="h-3.5 w-3.5" strokeWidth={2.25} />}
          title={t.title}
          eyebrow={t.key}
          subtitle={t.projectTitle}
        />
      ))}
    </SectionShell>
  );
}

function NoteSection({ hits, onPick }: { hits: NoteSearchHit[]; onPick: () => void }) {
  if (hits.length === 0) return null;
  return (
    <SectionShell label="Docs">
      {hits.map((n) => (
        <HitRow
          key={n.id}
          href={pmoHref(n.projectSlug, n.listId, `notes?noteId=${n.id}`)}
          onPick={onPick}
          icon={<FileText className="h-3.5 w-3.5" strokeWidth={2.25} />}
          title={n.title}
          subtitle={n.projectTitle}
        />
      ))}
    </SectionShell>
  );
}

function FileSection({ hits, onPick }: { hits: FileSearchHit[]; onPick: () => void }) {
  if (hits.length === 0) return null;
  return (
    <SectionShell label="Files">
      {hits.map((f) => (
        <HitRow
          key={f.id}
          href={pmoHref(
            f.projectSlug,
            f.listId,
            `files${f.parentFolderId ? `?folderId=${f.parentFolderId}` : ''}`,
          )}
          onPick={onPick}
          icon={<FolderOpen className="h-3.5 w-3.5" strokeWidth={2.25} />}
          title={f.name}
          subtitle={f.projectTitle}
        />
      ))}
    </SectionShell>
  );
}

function WhiteboardSection({ hits, onPick }: { hits: WhiteboardSearchHit[]; onPick: () => void }) {
  if (hits.length === 0) return null;
  return (
    <SectionShell label="Whiteboards">
      {hits.map((w) => (
        <HitRow
          key={w.id}
          href={pmoHref(w.projectSlug, w.listId, `whiteboards/${w.id}`)}
          onPick={onPick}
          icon={<Palette className="h-3.5 w-3.5" strokeWidth={2.25} />}
          title={w.title}
          subtitle={w.projectTitle}
        />
      ))}
    </SectionShell>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
