'use client';

import { ChatShell } from '@/components/chat/chat-shell';

export default function ChatLayoutShell({ children }: { children: React.ReactNode }) {
  return <ChatShell>{children}</ChatShell>;
}
