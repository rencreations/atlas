'use client';

import { MicOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { VoiceParticipantView } from '@/lib/voice/voice-provider';

/**
 * Deliberately minimal participant preview for the floating voice widget:
 * camera-or-avatar plus a speaking halo and a muted badge, nothing else
 * (no context menu, no moderation, no fullscreen - that's what the real
 * room view is for). Kept small enough that a handful fit in a corner
 * widget without crowding out whatever page the user is actually on.
 */
export function VoiceWidgetTile({ participant }: { participant: VoiceParticipantView }) {
  const { name, avatarUrl, isMuted, isSpeaking, isLocal, cameraTrack } = participant;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideo = !!cameraTrack;

  useEffect(() => {
    const el = videoRef.current;
    if (!cameraTrack || !el) return;
    cameraTrack.attach(el);
    return () => {
      cameraTrack.detach(el);
    };
  }, [cameraTrack]);

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
          muted={isLocal}
          playsInline
          className={cn('h-full w-full object-cover', isLocal ? 'scale-x-[-1]' : '')}
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
