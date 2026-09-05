'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Volume2 } from 'lucide-react';
import { getStoredSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { ChannelList } from '@/components/chat/channel-list';
import { cn } from '@/lib/utils';
import { RemoteAudioRenderer } from './remote-audio-renderer';
import { VoiceChatThreadPanel } from './voice-chat-thread-panel';
import { VoiceRoom } from './voice-room';

interface Props {
  channelId: string;
  channelName: string;
  channelTopic: string | null;
}

/**
 * Workspace-lobby voice page layout. Sidebar is the same shared
 * ChannelList every other chat/voice surface uses (global scope), main
 * pane shows VoiceRoom for the active channel.
 */
export function VoiceLobbyLayout({ channelId, channelName, channelTopic }: Props) {
  const session = getStoredSession();
  const isAdmin = session?.user.isAdmin === true;
  // Collapsible per-channel text thread (§10), same default as the
  // per-project layout: open on wide viewports, closed on narrow ones.
  const [chatOpen, setChatOpen] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setChatOpen(window.innerWidth >= 1024);
  }, []);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <RemoteAudioRenderer />
      <ChannelList
        scope={{ kind: 'global' }}
        activeChannelId={channelId}
        canManage={isAdmin}
      />

      <section className="flex min-w-0 flex-1 flex-col bg-surface">
        <header className="flex items-center gap-3 border-b border-line px-6 py-3">
          <Link
            href={'/' as never}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Home
          </Link>

          <div className="h-4 w-px bg-line" />
          <Volume2 className="h-4 w-4 text-ink-3" strokeWidth={2.25} />
          <h1 className="text-[15px] font-semibold text-ink">{channelName}</h1>
          {channelTopic ? (
            <span className="hidden truncate text-[13px] text-ink-3 md:inline">
              · {channelTopic}
            </span>
          ) : null}
          <div className="ml-auto">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={chatOpen ? 'Close channel chat' : 'Open channel chat'}
              onClick={() => setChatOpen((v) => !v)}
              className={cn(chatOpen ? 'text-brand-blue' : undefined)}
            >
              <MessageSquare className="h-4 w-4" strokeWidth={2.25} />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          <VoiceRoom
            channelId={channelId}
            channelName={channelName}
            projectId={null}
            projectSlugOrId={null}
            canModerate={isAdmin}
          />
        </div>
      </section>

      {session ? (
        <VoiceChatThreadPanel
          voiceChannelId={channelId}
          voiceChannelName={channelName}
          projectId={null}
          projectSlug={null}
          currentUserId={session.user.id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      ) : null}
    </div>
  );
}
