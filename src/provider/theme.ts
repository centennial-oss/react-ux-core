import { useSyncExternalStore } from 'react';

/** A theme the user can choose. `system` follows the operating system's light/dark setting. */
export type ThemePreference = 'system' | 'light' | 'dark' | 'high-contrast';

/** The theme actually applied (as `data-theme` on `<html>`). */
export type Theme = 'light' | 'dark' | 'high-contrast';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToColorScheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function getColorScheme(): 'light' | 'dark' {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function getServerColorScheme(): 'light' | 'dark' {
  return 'light';
}

/** The operating system's colour scheme, kept current through a `matchMedia` change listener (never polling). */
export function useSystemColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribeToColorScheme, getColorScheme, getServerColorScheme);
}

export function resolveTheme(preference: ThemePreference, systemScheme: 'light' | 'dark'): Theme {
  return preference === 'system' ? systemScheme : preference;
}
