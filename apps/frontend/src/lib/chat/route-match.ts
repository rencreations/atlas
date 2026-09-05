/**
 * Shared route patterns for chat/voice pages, single source of truth so
 * the chrome-locking logic (app layout) and the navbar's active-link
 * highlighting agree on what counts as "in chat".
 */
export const CHAT_CONVERSATION_RE = /^\/(projects\/[^/]+\/chat|chat)(\/|$)/;
export const VOICE_ROUTE_RE = /^\/(projects\/[^/]+\/)?voice\/[^/]+/;

export function isChatOrVoiceRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return CHAT_CONVERSATION_RE.test(pathname) || VOICE_ROUTE_RE.test(pathname);
}
