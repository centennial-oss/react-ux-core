import { createContext, useContext, useMemo } from 'react';
import { DefaultLink, type LinkComponentType } from './link';
import { defaultMessages, type CoreMessages, type Messages } from './messages';
import type { Theme, ThemePreference } from './theme';

// One context per concern, so a component re-renders only when the value it reads changes.

export interface ThemeContextValue {
  /** The applied theme (`system` already resolved to `light` or `dark`). */
  theme: Theme;
  /** The user's choice, which may be `system`. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
/** The core strings with the app's overrides, which may also hold other entry points' strings. */
export type ProvidedMessages = CoreMessages & Partial<Messages>;

export const MessagesContext = createContext<ProvidedMessages>(defaultMessages);
export const LinkContext = createContext<LinkComponentType>(DefaultLink);
export const TimeZoneContext = createContext<string | null>(null);

/** The current theme and a setter for the user's preference. Must be used inside `UIProvider`. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside <UIProvider>.');
  }
  return value;
}

/** The library's UI strings: English defaults merged with any overrides passed to `UIProvider`. */
export function useMessages(): CoreMessages {
  return useContext(MessagesContext);
}

/**
 * An entry point's strings: its English `defaults` under the app's overrides, with the core strings. Each entry
 * point ships its own defaults, so the main entry doesn't carry every string the library has.
 */
export function useEntryMessages<T extends object>(defaults: T): CoreMessages & T {
  const provided = useContext(MessagesContext);
  // The app's overrides (`Partial<Messages>`) go over this entry's defaults.
  return useMemo(() => ({ ...defaults, ...provided }), [defaults, provided]);
}

/** The component used to render links (`UIProvider`'s `LinkComponent`, or a plain anchor). */
export function useLinkComponent(): LinkComponentType {
  return useContext(LinkContext);
}

/** The default IANA time zone for displaying dates and times: `UIProvider`'s `timeZone`, or the browser's zone. */
export function useTimeZone(): string {
  return useContext(TimeZoneContext) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
