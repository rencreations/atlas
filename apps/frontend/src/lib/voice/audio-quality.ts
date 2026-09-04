import type { VoiceAudioQuality } from './types';

/** Bitrate caps per quality tier, used as LiveKit audio presets. */
export const AUDIO_PRESET_BITRATE: Record<VoiceAudioQuality, number> = {
  LOW: 32_000,
  STANDARD: 64_000,
  HIGH: 128_000,
};

interface NavigatorConnection {
  effectiveType?: string;
  downlink?: number;
}

/**
 * Dynamic audio quality: instead of a per-channel setting chosen at
 * creation time, every participant's mic publish is tuned to their own
 * connection when they join. Slow/capped links get LOW so voices stay
 * intelligible; broadband gets HIGH. Unknown browsers default to
 * STANDARD.
 */
export function dynamicAudioQuality(): VoiceAudioQuality {
  if (typeof navigator === 'undefined') return 'STANDARD';
  const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
  if (!connection) return 'STANDARD';

  const type = connection.effectiveType ?? '';
  const downlink = connection.downlink;
  if (type === 'slow-2g' || type === '2g' || (downlink !== undefined && downlink < 0.5)) {
    return 'LOW';
  }
  if (type === '3g' || (downlink !== undefined && downlink < 2)) {
    return 'STANDARD';
  }
  if (type === '4g' || downlink === undefined || downlink >= 2) {
    return 'HIGH';
  }
  return 'STANDARD';
}

/** LiveKit audio preset for the current connection. */
export function dynamicAudioPreset(): { maxBitrate: number } {
  return { maxBitrate: AUDIO_PRESET_BITRATE[dynamicAudioQuality()] };
}
