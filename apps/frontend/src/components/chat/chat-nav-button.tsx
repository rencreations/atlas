'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatOverview } from '@/lib/chat/use-chat-overview';
import { isChatOrVoiceRoute } from '@/lib/chat/route-match';
import { cn } from '@/lib/utils';

/**
 * Header shortcut, next to "My work". Navigates straight into the chat
 * app (the server rail + channel list + message window), rather than
 * previewing anything here.
 */
export function ChatNavButton() {
  const { totalUnread } = useChatOverview();
  const pathname = usePathname();
  const active = isChatOrVoiceRoute(pathname);

  return (
    <Link
      href={'/chat' as never}
      aria-label={totalUnread > 0 ? `Chat (${totalUnread} unread)` : 'Chat'}
      className={cn(
        'relative flex items-center gap-1.5 pb-1 text-[14px] font-medium transition-colors',
        active ? 'text-ink' : 'text-ink-2 hover:text-ink',
      )}
    >
      Chat
      {totalUnread > 0 ? (
        <span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-brand-blue-strong px-1 text-[10px] font-medium leading-none text-white">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      ) : null}
      {active ? <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-brand-blue-strong" /> : null}
    </Link>
  );
}
