'use client';

import Link from 'next/link';
import { useChatOverview } from '@/lib/chat/use-chat-overview';

/**
 * Header shortcut, next to "My work". Navigates straight into the chat
 * app (the server rail + channel list + message window), rather than
 * previewing anything here.
 */
export function ChatNavButton() {
  const { totalUnread } = useChatOverview();

  return (
    <Link
      href={'/chat' as never}
      aria-label={totalUnread > 0 ? `Chat (${totalUnread} unread)` : 'Chat'}
      className="relative flex items-center gap-1.5 pb-1 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
    >
      Chat
      {totalUnread > 0 ? (
        <span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-brand-blue-strong px-1 text-[10px] font-medium leading-none text-white">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      ) : null}
    </Link>
  );
}
