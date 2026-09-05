'use client';

import { useEffect, useRef } from 'react';
import type { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';
import { useVoice } from '@/lib/voice/voice-provider';

/**
 * Plays every remote participant's microphone audio. Mounted once at the
 * room level (not per-tile) so audio never stops for a participant just
 * because the grid hides their tile behind "+N more" pagination.
 */
export function RemoteAudioRenderer() {
  const { state } = useVoice();
  const participants = Array.from(state.participants.values()).filter(
    (p) => !p.isLocal && p.micTrack,
  );

  return (
    <>
      {participants.map((p) => (
        <ParticipantAudio key={p.identity} track={p.micTrack!} />
      ))}
    </>
  );
}

function ParticipantAudio({ track }: { track: RemoteAudioTrack | LocalAudioTrack }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return <audio ref={ref} autoPlay style={{ display: 'none' }} />;
}
