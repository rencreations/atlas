'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredSession } from '@/lib/auth-client';
import { sanitizeReturnTo } from '@/lib/auth-redirect';
import { LoadingShell } from '@/components/auth/loading-shell';
import { Header } from '@/components/layout/header';
import { NotificationsClient } from '@/components/notifications/notifications-client';
import { VoiceConnectedPanel } from '@/components/voice/voice-connected-panel';
import { SaveCoordinatorBeforeUnload } from '@/lib/save-coordinator';
import { GlobalUndoListener } from '@/lib/undo/use-global-undo';
import { CHAT_CONVERSATION_RE, VOICE_ROUTE_RE } from '@/lib/chat/route-match';

// Every chat page: /chat and /projects/<slug>/chat, bare or with a
// channel id, all render inside the server-rail chat shell now, so all
// of them need this chrome, including the two redirect-shim pages that
// briefly render before they know which channel to land on. Voice
// rooms, both /projects/<slug>/voice/<id> and /voice/<id>, get the same
// scroll-locked chrome. On these routes we hide the footer and lock
// the outer chrome to the viewport so the inner pane is what scrolls.

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = getStoredSession();

  useEffect(() => {
    if (!session) {
      // Carry the URL the user was trying to reach (path + query)
      // through the login round-trip so they land back on it after
      // authenticating, instead of being dumped on the dashboard.
      // Covers fresh deep-links and expired sessions alike —
      // getStoredSession() self-clears expired sessions.
      const target = sanitizeReturnTo(`${pathname ?? ''}${window.location.search}`);
      router.push(target ? `/login?callbackUrl=${encodeURIComponent(target)}` : '/login');
    }
  }, [session, router, pathname]);

  if (!session) {
    // Brief loading shell while the redirect to /login happens, so
    // unauthenticated visitors see feedback instead of a blank flash.
    return <LoadingShell />;
  }

  const isChatConversation = pathname ? CHAT_CONVERSATION_RE.test(pathname) : false;
  const isVoiceRoute = pathname ? VOICE_ROUTE_RE.test(pathname) : false;
  const lockChrome = isChatConversation || isVoiceRoute;

  if (lockChrome) {
    return (
      <div className="flex h-svh flex-col overflow-hidden">
        <Header user={session.user} />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        <VoiceConnectedPanel />
        <NotificationsClient />
        <SaveCoordinatorBeforeUnload />
        <GlobalUndoListener />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Header user={session.user} />
      <main className="flex-1">{children}</main>
      <VoiceConnectedPanel />
      <NotificationsClient />
      <SaveCoordinatorBeforeUnload />
    </div>
  );
}

