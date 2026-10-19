import { useMediaQuery } from '../utils/useMediaQuery';

/** A theme the user can choose. `system` follows the operating system's light/dark setting. */
export type ThemePreference = 'system' | 'light' | 'dark' | 'high-contrast';

/** The theme actually applied (as `data-theme` on `<html>`). */
export type Theme = 'light' | 'dark' | 'high-contrast';

/** The operating system's colour scheme, kept current through a `matchMedia` change listener (never polling). */
export function useSystemColorScheme(): 'light' | 'dark' {
  return useMediaQuery('(prefers-color-scheme: dark)') ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference, systemScheme: 'light' | 'dark'): Theme {
  return preference === 'system' ? systemScheme : preference;
}
