'use client';

const KEY_PREFIX = 'atlas_last_list:';

/**
 * Per-user, per-project "last opened task list" mirror, keyed by the
 * user id so two accounts on the same browser don't share it. Written
 * by the task list layout whenever a list loads, read by the task list
 * index redirect and the project detail page's contributor deep-link.
 */
function keyFor(userId: string | null | undefined, projectSlug: string) {
  return `${KEY_PREFIX}${userId ?? 'anon'}:${projectSlug}`;
}

export function getLastListId(projectSlug: string, userId?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(keyFor(userId, projectSlug));
  } catch {
    return null;
  }
}

export function setLastListId(projectSlug: string, listId: string, userId?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(userId, projectSlug), listId);
  } catch {
    // Private mode / quota, best effort only.
  }
}
