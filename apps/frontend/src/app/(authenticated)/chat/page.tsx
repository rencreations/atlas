'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { defaultChannelId } from '@/lib/chat/overview';
import { useChatOverview } from '@/lib/chat/use-chat-overview';
import { usePageTitle } from '@/lib/page-title';

/**
 * Chat home. The server rail (ChatShell, mounted by this route's
 * layout.tsx) is the actual navigation; this page just resolves which
 * workspace channel to land on and redirects, mirroring the project
 * chat index page's pattern.
 */
export default function ChatHomePage() {
  usePageTitle('Chat');
  const router = useRouter();
  const { overview, workspace } = useChatOverview();

  React.useEffect(() => {
    if (!workspace) return;
    const target = defaultChannelId(workspace.channels);
    if (target) router.replace(`/chat/global/${target}` as never);
  }, [workspace, router]);

  return (
    <div className="grid h-full flex-1 place-items-center">
      {overview.isError ? (
        <p className="text-[13px] text-ink-3">Couldn&apos;t load chat. Try refreshing.</p>
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-ink-3" strokeWidth={2.25} />
      )}
    </div>
  );
}
