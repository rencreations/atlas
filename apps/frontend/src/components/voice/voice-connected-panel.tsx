'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useMotionValue, type PanInfo } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  CircleDot,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useVoice } from '@/lib/voice/voice-provider';
import { VoiceWidgetTile } from './voice-widget-tile';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNER_STORAGE_KEY = 'atlas.voice-widget.corner';
const EXPANDED_STORAGE_KEY = 'atlas.voice-widget.expanded';
const CORNER_CLASSES: Record<Corner, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};
/** How many participant previews the widget shows before collapsing the rest into "+N". */
const MAX_PREVIEW_TILES = 6;

/**
 * Persistent "you're in a call" floating widget. Mounted in
 * (authenticated)/layout.tsx so it survives any navigation within the
 * authenticated area (the underlying LiveKit Room, held in VoiceProvider
 * up in app/providers.tsx, already survives navigation on its own - this
 * is purely the UI for it). Draggable, snaps to whichever corner it's
 * released nearest, remembers that corner and its expanded/concise state
 * across reloads. Hides itself on the call's own page, there's no point
 * floating a mini duplicate over the real room view.
 */
export function VoiceConnectedPanel() {
  const { state, actions } = useVoice();
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [corner, setCorner] = React.useState<Corner>('bottom-left');
  const [expanded, setExpanded] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Read the last-used corner/mode once on mount; write them back on change.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedCorner = window.localStorage.getItem(CORNER_STORAGE_KEY);
    if (storedCorner && storedCorner in CORNER_CLASSES) setCorner(storedCorner as Corner);
    setExpanded(window.localStorage.getItem(EXPANDED_STORAGE_KEY) === 'true');
    setHydrated(true);
  }, []);
  React.useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(CORNER_STORAGE_KEY, corner);
  }, [corner, hydrated]);
  React.useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(EXPANDED_STORAGE_KEY, String(expanded));
  }, [expanded, hydrated]);

  const voiceHref = state.channelId
    ? state.projectSlug
      ? `/projects/${state.projectSlug}/voice/${state.channelId}`
      : `/voice/${state.channelId}`
    : null;
  const onOwnVoicePage = voiceHref !== null && pathname === voiceHref;

  if (state.connectionState === 'idle' || state.connectionState === 'disconnected' || onOwnVoicePage) {
    return null;
  }

  const isError = state.connectionState === 'error';
  const isConnecting =
    state.connectionState === 'connecting' || state.connectionState === 'reconnecting';

  function handleDragEnd(_e: unknown, _info: PanInfo) {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const vertical = centerY < window.innerHeight / 2 ? 'top' : 'bottom';
    const horizontal = centerX < window.innerWidth / 2 ? 'left' : 'right';
    setCorner(`${vertical}-${horizontal}` as Corner);
    // Snap back to 0/0: the widget's position is now driven by the plain
    // corner-anchored classes below, not the drag transform.
    x.set(0);
    y.set(0);
  }

  const participants = Array.from(state.participants.values());
  const localParticipant = participants.find((p) => p.isLocal) ?? null;
  const nonLocalParticipants = participants.filter((p) => !p.isLocal);

  let previewTiles = participants;
  let hiddenCount = 0;
  if (expanded && participants.length > MAX_PREVIEW_TILES) {
    const rankedOthers = [...nonLocalParticipants].sort(
      (a, b) =>
        (state.speakingScore.get(b.identity) ?? 0) - (state.speakingScore.get(a.identity) ?? 0),
    );
    const slots = Math.max(0, MAX_PREVIEW_TILES - (localParticipant ? 1 : 0) - 1);
    const shown = rankedOthers.slice(0, slots);
    hiddenCount = rankedOthers.length - shown.length;
    previewTiles = localParticipant ? [localParticipant, ...shown] : shown;
  }

  return (
    <motion.div
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
      style={{ x, y }}
      className={cn('fixed z-50 w-72 rounded-xl border border-line-2 bg-surface-1 shadow-2 backdrop-blur-sm', CORNER_CLASSES[corner])}
    >
      <div
        className="flex cursor-grab items-center gap-2 border-b border-line-2 px-3 py-2 active:cursor-grabbing"
        onClick={() => {
          if (voiceHref) router.push(voiceHref as never);
        }}
      >
        {isError ? (
          <WifiOff className="h-4 w-4 shrink-0 text-brand-red" strokeWidth={2.25} />
        ) : isConnecting ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-blue" strokeWidth={2.25} />
        ) : (
          <ConnectionBars quality={state.connectionQuality} />
        )}
        <div className="min-w-0 flex-1 cursor-pointer">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-ink-1">
              {state.channelName ?? 'Connecting…'}
            </span>
            {state.recording ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-brand-red-strong px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                title={`Recording started by ${state.recording.startedByName}`}
              >
                <CircleDot className="h-2 w-2 animate-pulse" strokeWidth={2.25} />
                REC
              </span>
            ) : null}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-ink-3">
            {state.connectionState === 'connected'
              ? `${state.participants.size} ${state.participants.size === 1 ? 'person' : 'people'}${
                  state.ping !== null ? ` · ${state.ping}ms` : ''
                }`
              : state.connectionState === 'reconnecting'
                ? 'Reconnecting…'
                : isError
                  ? 'Disconnected'
                  : 'Connecting…'}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-label={expanded ? 'Collapse' : 'Show participants'}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} />
          )}
        </Button>
      </div>

      {state.error ? (
        <div className="px-3 py-1.5 text-[11px] text-brand-red">{state.error}</div>
      ) : null}

      {expanded && state.connectionState === 'connected' ? (
        <div className="grid grid-cols-3 gap-1.5 p-2">
          {previewTiles.map((p) => (
            <VoiceWidgetTile key={p.identity} participant={p} />
          ))}
          {hiddenCount > 0 ? (
            <div className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg bg-surface-muted text-ink-3">
              <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className="text-[10px] font-medium">+{hiddenCount}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void actions.toggleMute()}
              disabled={state.connectionState !== 'connected'}
              aria-label={state.micMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {state.micMuted ? (
                <MicOff className="h-4 w-4 text-brand-red" strokeWidth={2.25} />
              ) : (
                <Mic className="h-4 w-4" strokeWidth={2.25} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{state.micMuted ? 'Unmute' : 'Mute'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void actions.toggleCamera()}
              disabled={state.connectionState !== 'connected'}
              aria-label={state.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
            >
              {state.cameraEnabled ? (
                <Video className="h-4 w-4 text-brand-blue" strokeWidth={2.25} />
              ) : (
                <VideoOff className="h-4 w-4" strokeWidth={2.25} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{state.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void actions.leaveChannel()}
              aria-label="Disconnect from voice"
            >
              <PhoneOff className="h-4 w-4 text-brand-red" strokeWidth={2.25} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Disconnect</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

/**
 * Discord-style wifi bars. quality:
 *   excellent → 3 bars green
 *   good      → 2 bars green
 *   poor      → 1 bar yellow/red
 *   unknown   → grey Wifi icon (haven't received a quality event yet)
 */
function ConnectionBars({
  quality,
}: {
  quality: 'excellent' | 'good' | 'poor' | 'unknown';
}) {
  if (quality === 'unknown') {
    return <Wifi className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2.25} />;
  }
  const activeBars = quality === 'excellent' ? 3 : quality === 'good' ? 2 : 1;
  const color =
    quality === 'excellent' || quality === 'good'
      ? 'bg-brand-green-strong'
      : 'bg-brand-yellow';
  return (
    <div
      className="flex h-4 shrink-0 items-end gap-px"
      title={`Connection quality: ${quality}`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-sm',
            i === 1 ? 'h-2' : i === 2 ? 'h-3' : 'h-4',
            i <= activeBars ? color : 'bg-line-2',
          )}
        />
      ))}
    </div>
  );
}
