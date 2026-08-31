'use client';

import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  CircleDashed,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/lib/types';
import { TASK_PRIORITY_LABEL } from '@/lib/types';

const ICONS: Record<TaskPriority, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  // NONE used to share Minus with MEDIUM, so "no priority" and "medium"
  // were the same glyph.
  NONE: CircleDashed,
  LOW: ChevronDown,
  MEDIUM: Minus,
  HIGH: ChevronUp,
  URGENT: ChevronsUp,
};

// Suppress dead-code warning for the unused ChevronsDown import in some bundlers.
void ChevronsDown;

const TONES: Record<TaskPriority, string> = {
  NONE: 'text-ink-3',
  LOW: 'text-ink-2',
  MEDIUM: 'text-brand-blue',
  HIGH: 'text-brand-yellow-ink',
  URGENT: 'text-brand-red',
};

export function PriorityChip({
  priority,
  className,
  size = 'sm',
  showNone = false,
}: {
  priority: TaskPriority;
  className?: string;
  size?: 'sm' | 'md';
  /** Render an icon for NONE too. Off by default so compact surfaces
   *  (kanban cards, rows) don't show a meaningless glyph next to the key. */
  showNone?: boolean;
}) {
  if (priority === 'NONE' && !showNone) return null;
  const Icon = ICONS[priority];
  const tone = TONES[priority];
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span
      // A bare <span> may not carry aria-label; role="img" makes the
      // icon-only chip a legal, announceable graphic.
      role="img"
      className={cn('inline-flex items-center gap-1', tone, className)}
      aria-label={`Priority: ${TASK_PRIORITY_LABEL[priority]}`}
      title={TASK_PRIORITY_LABEL[priority]}
    >
      <Icon className={iconSize} strokeWidth={2.25} />
    </span>
  );
}

// The ordering here matters for sticker pack moderation flow
