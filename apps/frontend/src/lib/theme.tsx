'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { apiPaths } from '@/lib/api/paths';
import { getSessionId } from '@/lib/auth-client';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'atlas_theme';

interface ThemeContextValue {
  theme: ThemePreference;
  /** Apply a theme locally (the settings page also persists it via PATCH /users/me). */
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => undefined });

function applyTheme(pref: ThemePreference): void {
  const root = document.documentElement;
  if (pref === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else if (pref === 'light') {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', systemDark);
    root.style.colorScheme = systemDark ? 'dark' : 'light';
  }
}

/**
 * Per-user theme (light | dark | system). The preference is stored on
 * the user record and mirrored in localStorage for instant boot-time
 * application before the session fetch completes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      applyTheme('system');
    }
    // When signed in, the server value wins (survives browser wipes).
    if (getSessionId()) {
      api<{ theme?: ThemePreference }>(apiPaths.me())
        .then((me) => {
          if (me.theme === 'light' || me.theme === 'dark' || me.theme === 'system') {
            setThemeState(me.theme);
            localStorage.setItem(STORAGE_KEY, me.theme);
            applyTheme(me.theme);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
