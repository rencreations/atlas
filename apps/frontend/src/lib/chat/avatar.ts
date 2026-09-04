import type { ChatAvatarInfo } from '@/lib/types';

/** Emoji pool for the derived default server avatars. */
const DEFAULT_EMOJIS = ['🚀', '🎨', '🎧', '📚', '🛠️', '🌱', '⚡', '🧪', '🎮', '📡', '🏗️', '🧭'];

/** Background pool, kept WCAG-friendly with white glyphs (dark tiles). */
const DEFAULT_COLORS = [
  '#5865F2',
  '#3BA55D',
  '#EB459E',
  '#FAA61A',
  '#ED4245',
  '#2D7D46',
  '#7B3FE4',
  '#0F8A9D',
  '#B65C1D',
  '#4A5FC1',
  '#A6328D',
  '#1E7F5C',
];

/** FNV-1a style string hash, stable across sessions and devices. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface ChatAvatarRender {
  emoji: string;
  color: string;
  imageUrl: string | null;
}

/**
 * Resolve a chat server avatar. Priority: an admin-uploaded picture,
 * then an admin-picked emoji/color, then the stable random default
 * derived from the key (so every user sees the same tile for a server).
 * The workspace server has its own globe default instead of a random pick.
 */
export function chatAvatarFor(seed: string, avatar?: ChatAvatarInfo | null): ChatAvatarRender {
  if (avatar?.imageUrl) {
    return { emoji: avatar.emoji ?? '', color: avatar.color ?? '', imageUrl: avatar.imageUrl };
  }
  if (!avatar && seed === 'workspace') {
    return { emoji: '🌐', color: '#5865F2', imageUrl: null };
  }
  const h = hashString(seed);
  return {
    emoji: avatar?.emoji && avatar.emoji.trim() ? avatar.emoji : DEFAULT_EMOJIS[h % DEFAULT_EMOJIS.length],
    color: avatar?.color ?? DEFAULT_COLORS[h % DEFAULT_COLORS.length],
    imageUrl: null,
  };
}
