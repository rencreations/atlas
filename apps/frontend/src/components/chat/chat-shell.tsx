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
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
