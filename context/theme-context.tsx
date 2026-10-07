'use client';

import { createContext, useContext, useEffect, useCallback, useSyncExternalStore } from 'react';
import { readPreference, writePreference, subscribePreferences } from '@/lib/client/browser-preferences';

type Theme = 'light' | 'dark' | 'system';
interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = 'app-theme';

function getStoredTheme(): Theme {
  const stored = readPreference(THEME_STORAGE_KEY, 'system');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}
function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribePreferences, getStoredTheme, () => 'system' as Theme);
  const systemDark = useSyncExternalStore(subscribeSystemTheme, () => window.matchMedia('(prefers-color-scheme: dark)').matches, () => false);
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  const setTheme = useCallback((value: Theme) => writePreference(THEME_STORAGE_KEY, value), []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      <script dangerouslySetInnerHTML={{ __html: `try { var t = localStorage.getItem('app-theme'); var d = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.add(d ? 'dark' : 'light'); document.documentElement.style.colorScheme = d ? 'dark' : 'light'; } catch {}` }} />
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
