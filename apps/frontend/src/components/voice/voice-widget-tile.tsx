'use client';

import { MicOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useVoice, type VoiceParticipantView } from '@/lib/voice/voice-provider';

/**
 * Deliberately minimal participant preview for the floating voice widget:
 * camera-or-avatar plus a speaking halo and a muted badge, nothing else
 * (no context menu, no moderation, no fullscreen - that's what the real
 * room view is for). Kept small enough that a handful fit in a corner
 * widget without crowding out whatever page the user is actually on.
 */
export function VoiceWidgetTile({ participant }: { participant: VoiceParticipantView }) {
  const { name, avatarUrl, isMuted, isSpeaking, isLocal, cameraTrack } = participant;
  const { state } = useVoice();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideo = !!cameraTrack;

  // Belt-and-suspenders "is this me" (see participant-tile.tsx for why).
  const isSelf = isLocal || participant.identity === state.localIdentity;
  const mirrorSelfView = state.preferences?.mirrorSelfView ?? true;

  useEffect(() => {
    const el = videoRef.current;
    if (!cameraTrack || !el) return;
    // Set imperatively, not just via the JSX `muted` prop below - React's
    // handling of `muted` on media elements combined with `autoPlay` is
    // unreliable, and this is the one element where getting that wrong
    // means hearing your own voice.
    el.muted = isSelf;
    cameraTrack.attach(el);
    return () => {
      cameraTrack.detach(el);
    };
  }, [cameraTrack, isSelf]);

  return (
    <div
      className={cn(
        'relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface-1',
        isSpeaking && !isMuted ? 'voice-speaking-halo' : '',
      )}
      title={name}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isSelf}
          playsInline
          className={cn('h-full w-full object-cover', isSelf && mirrorSelfView ? 'scale-x-[-1]' : '')}
        />
      ) : (
        <Avatar src={avatarUrl} name={name} size={32} />
      )}
      {isMuted ? (
        <span className="absolute bottom-0.5 right-0.5 inline-grid h-3.5 w-3.5 place-items-center rounded-full bg-brand-red-strong">
          <MicOff className="h-2 w-2 text-white" strokeWidth={2.5} />
        </span>
      ) : null}
    </div>
  );
}
