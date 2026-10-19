import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { ToastRegion, type ToastPlacement } from '../components/Toast/ToastRegion';
import { useControllableState } from '../utils/useControllableState';
import {
  LinkContext,
  MessagesContext,
  ThemeContext,
  TimeZoneContext,
  type ThemeContextValue,
  type ProvidedMessages,
} from './context';
import { DefaultLink, type LinkComponentType } from './link';
import { commonStrings } from './coreStrings';
import type { Messages } from './messages';
import { resolveTheme, useSystemColorScheme, type ThemePreference } from './theme';

export interface UIProviderProps {
  children?: ReactNode;
  /** BCP 47 locale for formatting and React Aria behaviour. Defaults to the browser's locale. */
  locale?: string;
  /** Overrides for the library's UI strings. Unset keys use the English defaults. */
  messages?: Partial<Messages>;
  /** Renders every `href` in the library, so links use the app's router. Defaults to a plain `<a>`. */
  LinkComponent?: LinkComponentType;
  /** The theme preference, controlled. Pair with `onThemePreferenceChange`. */
  themePreference?: ThemePreference;
  /** The initial theme preference when uncontrolled. Defaults to `system`. */
  defaultThemePreference?: ThemePreference;
  /** Called when the preference changes, for example from a settings menu. Persisting it is the app's job. */
  onThemePreferenceChange?: (preference: ThemePreference) => void;
  /** Default IANA time zone for date and time display. Defaults to the browser's zone. */
  timeZone?: string;
  /** Where toasts appear on tablet and desktop. Defaults to `bottom-end`; phones always use the bottom. */
  toastPlacement?: ToastPlacement;
}

/**
 * Wraps the app. Provides locale, UI strings, the link component, the theme and the default time zone, applies the
 * resolved theme as `data-theme` on `<html>`, and renders the toast region.
 */
export function UIProvider({
  children,
  locale,
  messages,
  LinkComponent = DefaultLink,
  themePreference,
  defaultThemePreference = 'system',
  onThemePreferenceChange,
  timeZone,
  toastPlacement,
}: UIProviderProps) {
  const [preference, setPreference] = useControllableState(
    themePreference,
    defaultThemePreference,
    onThemePreferenceChange,
  );
  const systemScheme = useSystemColorScheme();
  const theme = resolveTheme(preference, systemScheme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = theme;
    return () => {
      if (previous === undefined) {
        delete root.dataset.theme;
      } else {
        root.dataset.theme = previous;
      }
    };
  }, [theme]);

  const themeValue = useMemo<ThemeContextValue>(
    () => ({ theme, preference, setPreference }),
    [theme, preference, setPreference],
  );
  const mergedMessages = useMemo<ProvidedMessages>(
    () => ({ ...commonStrings, ...messages }),
    [messages],
  );

  return (
    <I18nProvider locale={locale}>
      <ThemeContext.Provider value={themeValue}>
        <MessagesContext.Provider value={mergedMessages}>
          <LinkContext.Provider value={LinkComponent}>
            <TimeZoneContext.Provider value={timeZone ?? null}>
              {children}
              <ToastRegion placement={toastPlacement} />
            </TimeZoneContext.Provider>
          </LinkContext.Provider>
        </MessagesContext.Provider>
      </ThemeContext.Provider>
    </I18nProvider>
  );
}
