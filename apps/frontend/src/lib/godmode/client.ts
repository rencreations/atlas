'use client';

import { apiPaths } from '@/lib/api/paths';

const TOKEN_STORAGE_KEY = 'atlas_godmode_token';
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export function getGodmodeToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeGodmodeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearGodmodeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class GodmodeError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Fetch wrapper for the godmode control plane. Sends the unlock token in
 * `X-Godmode-Token`; 401s bubble up as GodmodeError so the UI can fall
 * back to the unlock screen.
 */
export async function godmodeFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getGodmodeToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { 'x-godmode-token': token } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearGodmodeToken();
    throw new GodmodeError('Godmode session expired.', 401);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Request failed (${res.status}).`);
    throw new GodmodeError(message, res.status);
  }
  return body as T;
}

export const godmodePaths = apiPaths.godmode;
