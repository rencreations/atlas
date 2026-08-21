'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { getSessionId } from '@/lib/auth-client';
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
  type RGB,
  type ThemeMode,
} from '@/lib/themes/registry';

export type { ThemeMode } from '@/lib/themes/registry';

const ID_KEY = 'atlas_theme_id';
const MODE_KEY = 'atlas_theme_mode';
/** Written by the pre-2026 ThemeProvider; maps to the new mode field. */
const LEGACY_KEY = 'atlas_theme';

interface ThemeContextValue {
  /** Active theme id (catalog key). */
  themeId: string;
  /** User preference: light | dark | system. */
  mode: ThemeMode;
  /** The mode actually applied (system resolved to the OS preference). */
  resolved: 'light' | 'dark';
  /** Switch theme; the settings page persists it via PATCH /users/me. */
  setThemeId: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
  /** Clear the local override and fall back to the instance default theme. */
  resetToDefault: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  mode: 'system',
  resolved: 'light',
  setThemeId: () => undefined,
  setMode: () => undefined,
  resetToDefault: () => undefined,
});

function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Apply a theme + mode to the document (attributes, color-scheme, meta). */
function applyTheme(themeId: string, mode: ThemeMode): void {
  const root = document.documentElement;
  const id = isThemeId(themeId) ? themeId : DEFAULT_THEME_ID;
  root.setAttribute('data-theme', id);

  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';

  // Keep the browser chrome (mobile URL bar etc.) in tune with the theme.
  const palette = dark ? getTheme(id).dark : getTheme(id).light;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', rgbToHex(palette.bg));
}

function readLocalStorage(): { id: string; mode: ThemeMode } {
  const storedId = typeof window !== 'undefined' ? window.localStorage.getItem(ID_KEY) : null;
  const storedMode = typeof window !== 'undefined' ? window.localStorage.getItem(MODE_KEY) : null;
  const legacy = typeof window !== 'undefined' ? window.localStorage.getItem(LEGACY_KEY) : null;
  const mode: ThemeMode =
    storedMode === 'light' || storedMode === 'dark' || storedMode === 'system'
      ? storedMode
      : legacy === 'light' || legacy === 'dark' || legacy === 'system'
        ? legacy
        : 'system';
  return { id: isThemeId(storedId) ? storedId : DEFAULT_THEME_ID, mode };
}

interface AppearanceConfig {
  defaultTheme: string;
  defaultThemeMode: ThemeMode;
  allowUserThemes: boolean;
}

/**
 * Per-user theme (24 catalog themes × light/dark/system mode). Resolution
 * order: the signed-in user's record → instance default (godmode
 * `appearance.*`) → atlas/system. Mirrored in localStorage for instant
 * pre-paint application by the inline bootstrap script in the root layout.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [defaults, setDefaults] = useState<AppearanceConfig>({
    defaultTheme: DEFAULT_THEME_ID,
    defaultThemeMode: 'system',
    allowUserThemes: true,
  });

  // Boot: apply the local mirror immediately, then let the server win.
  useEffect(() => {
    const local = readLocalStorage();
    setThemeIdState(local.id);
    setModeState(local.mode);
    applyTheme(local.id, local.mode);

    let cancelled = false;

    async function resolve() {
      let cfg: AppearanceConfig | null = null;
      try {
        const pc = await api<{ appearance?: Partial<AppearanceConfig> }>(apiPaths.publicConfig());
        const a = pc.appearance ?? {};
        cfg = {
          defaultTheme: isThemeId(a.defaultTheme) ? (a.defaultTheme as string) : DEFAULT_THEME_ID,
          defaultThemeMode:
            a.defaultThemeMode === 'light' || a.defaultThemeMode === 'dark'
              ? (a.defaultThemeMode as ThemeMode)
              : 'system',
          allowUserThemes: a.allowUserThemes !== false,
        };
        if (!cancelled) setDefaults(cfg);
      } catch {
        /* offline / not configured — local mirror stays */
      }

      let user: { themeId?: string | null; themeMode?: string | null } | null = null;
      if (getSessionId()) {
        try {
          user = await api<{ themeId?: string | null; themeMode?: string | null }>(
            apiPaths.me(),
          );
        } catch {
          user = null;
        }
      }

      if (cancelled) return;
      const base = cfg ?? defaults;

      // Theme lock (godmode) → instance default for everyone.
      // Signed in → the user record, falling back to the instance default.
      // Anonymous → the visitor's local preview if one exists, otherwise
      // the instance default (so first-time visitors see the superadmin's
      // chosen theme).
      let nextId: string;
      let nextMode: ThemeMode;
      if (!base.allowUserThemes) {
        nextId = base.defaultTheme;
        nextMode = base.defaultThemeMode;
      } else if (user !== null) {
        nextId = isThemeId(user.themeId) ? (user.themeId as string) : base.defaultTheme;
        nextMode =
          user.themeMode === 'light' || user.themeMode === 'dark' || user.themeMode === 'system'
            ? (user.themeMode as ThemeMode)
            : base.defaultThemeMode;
      } else {
        const hasLocal = window.localStorage.getItem(ID_KEY) !== null;
        const local = readLocalStorage();
        nextId = hasLocal ? local.id : base.defaultTheme;
        nextMode = hasLocal ? local.mode : base.defaultThemeMode;
      }
      setThemeIdState(nextId);
      setModeState(nextMode);
      applyTheme(nextId, nextMode);
      window.localStorage.setItem(ID_KEY, nextId);
      window.localStorage.setItem(MODE_KEY, nextMode);
    }

    void resolve();

    // React to OS preference flips while in system mode.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setModeState((m) => {
        if (m === 'system') {
          const dark = mq.matches;
          document.documentElement.classList.toggle('dark', dark);
          document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        }
        return m;
      });
    };
    mq.addEventListener('change', onChange);

    return () => {
      cancelled = true;
      mq.removeEventListener('change', onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setThemeId = useCallback(
    (id: string) => {
      if (!isThemeId(id)) return;
      setThemeIdState(id);
      applyTheme(id, mode);
      window.localStorage.setItem(ID_KEY, id);
    },
    [mode],
  );

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyTheme(document.documentElement.getAttribute('data-theme') ?? DEFAULT_THEME_ID, next);
    window.localStorage.setItem(MODE_KEY, next);
  }, []);

  const resetToDefault = useCallback(() => {
    window.localStorage.removeItem(ID_KEY);
    setThemeIdState(defaults.defaultTheme);
    setModeState(defaults.defaultThemeMode);
    applyTheme(defaults.defaultTheme, defaults.defaultThemeMode);
    window.localStorage.setItem(MODE_KEY, defaults.defaultThemeMode);
  }, [defaults]);

  const resolved: 'light' | 'dark' =
    mode === 'dark' || (mode === 'system' && systemPrefersDark()) ? 'dark' : 'light';

  return (
    <ThemeContext.Provider value={{ themeId, mode, resolved, setThemeId, setMode, resetToDefault }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
