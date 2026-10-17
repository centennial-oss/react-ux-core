// English defaults of the settings menu's strings: their own table, so SettingsMenu (also exported from the main
// entry) doesn't bring in every /shell string.
import { useEntryMessages } from '../provider/context';
import type { CoreMessages, ShellMessages } from '../provider/messages';

export type SettingsMessages = Pick<
  ShellMessages,
  'settings' | 'theme' | 'themeSystem' | 'themeLight' | 'themeDark' | 'themeHighContrast'
>;

export const defaultSettingsMessages: SettingsMessages = {
  settings: 'Settings',
  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeHighContrast: 'High contrast',
};

/** The settings menu's strings, with the app's overrides from `UIProvider`. */
export function useSettingsMessages(): CoreMessages & SettingsMessages {
  return useEntryMessages(defaultSettingsMessages);
}
