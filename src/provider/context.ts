import { createContext, useContext, useMemo } from 'react';
import { DefaultLink, type LinkComponentType } from './link';
import { commonStrings, type CommonMessages } from './coreStrings';
import type { Messages } from './messages';
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
/**
 * The common strings with the app's overrides, which may hold any other string too. Other defaults come with the
 * components that use them (`useEntryMessages`).
 */
export type ProvidedMessages = CommonMessages & Partial<Messages>;

export const MessagesContext = createContext<ProvidedMessages>(commonStrings);
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

/** The common strings with the app's overrides, for components that need no other strings. */
export function useCommonMessages(): CommonMessages {
  return useContext(MessagesContext);
}

/**
 * A component's strings: its English `defaults` (its own, and the core string groups it uses) under the app's
 * overrides, with the common strings. Each component ships only its own defaults, so a bundle never carries every
 * string the library has. `defaults` must be a module-level constant, so it keeps its identity between renders.
 */
export function useEntryMessages<T extends object>(defaults: T): CommonMessages & T {
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
