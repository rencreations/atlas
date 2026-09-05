'use client';

import { ChatShell } from '@/components/chat/chat-shell';

export default function ProjectVoiceLayoutShell({ children }: { children: React.ReactNode }) {
  return <ChatShell>{children}</ChatShell>;
}
