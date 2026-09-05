'use client';

import { ChatRail } from './chat-rail';

/**
 * The one chat experience: a server rail on the left, whatever the
 * route renders (channel list + message window) filling the rest.
 * Mounted by both /chat's and every project's chat layout.tsx so
 * switching "servers" never leaves chat.
 */
export function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0">
      <ChatRail />
      {/* min-w-0: without it, a flex item's default minimum width is its
          content's min-content size, not 0. If whatever's inside ever
          needs more room than this row has (an un-truncated channel
          name/topic, the pin panel's reserved padding, ...), the item
          would rather grow past its own flex-basis and overflow the
          viewport than shrink to fit it, which is exactly what pushed
          the pinned-messages panel out of frame before. */}
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
