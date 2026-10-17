import { Contrast, Monitor, Moon, Settings, Sun } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import type { Key } from 'react-aria-components';
import { IconButton } from '../components/IconButton/IconButton';
import { Menu, MenuItem, MenuSection, MenuTrigger } from '../components/Menu/Menu';
import { useTheme } from '../provider/context';
import type { ThemePreference } from '../provider/theme';
import { useSettingsMessages } from './settingsMessages';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark', 'high-contrast'];
const themeIcons = { system: Monitor, light: Sun, dark: Moon, 'high-contrast': Contrast } as const;

/** The theme choice (System, Light, Dark, High contrast) as a menu section, bound to `useTheme()`. */
export function ThemeMenuSection() {
  const messages = useSettingsMessages();
  const { preference, setPreference } = useTheme();
  const labels: Record<ThemePreference, string> = {
    system: messages.themeSystem,
    light: messages.themeLight,
    dark: messages.themeDark,
    'high-contrast': messages.themeHighContrast,
  };
  return (
    <MenuSection
      title={messages.theme}
      aria-label={messages.theme}
      layout="choice"
      selectedKeys={[preference]}
      onSelectionChange={(keys) => {
        if (keys === 'all') {
          return;
        }
        const [next] = [...keys];
        if (typeof next === 'string' && (THEMES as readonly string[]).includes(next)) {
          setPreference(next as ThemePreference);
        }
      }}
    >
      {THEMES.map((theme) => (
        <MenuItem key={theme} id={theme} icon={themeIcons[theme]} textValue={labels[theme]}>
          {labels[theme]}
        </MenuItem>
      ))}
    </MenuSection>
  );
}

export interface SettingsMenuItemsProps {
  /** Shows the theme choice first. Defaults to true. */
  hasThemeChoice?: boolean;
  /** The app's own rows, for example time display or language (`MenuSection` with `layout="choice"`, or items). */
  children?: ReactNode;
}

/** The settings menu's contents, for use inside another menu (a Header's `compactActions` on phones). */
export function SettingsMenuItems({ hasThemeChoice = true, children }: SettingsMenuItemsProps) {
  return (
    <>
      {hasThemeChoice && <ThemeMenuSection />}
      {children}
    </>
  );
}

export interface SettingsMenuProps extends SettingsMenuItemsProps {
  /** Called with the `id` of a chosen item in the app's rows. */
  onAction?: (key: Key) => void;
  /** Names the trigger. Defaults to the `settings` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/** A settings button with a menu: the theme choice, then the app's rows. Choices stay open while changing. */
export function SettingsMenu({
  hasThemeChoice,
  children,
  onAction,
  'aria-label': ariaLabel,
  className,
  ref,
}: SettingsMenuProps) {
  const messages = useSettingsMessages();
  const label = ariaLabel ?? messages.settings;
  return (
    <MenuTrigger>
      <IconButton icon={Settings} aria-label={label} className={className} ref={ref} />
      <Menu aria-label={label} onAction={onAction}>
        <SettingsMenuItems hasThemeChoice={hasThemeChoice}>{children}</SettingsMenuItems>
      </Menu>
    </MenuTrigger>
  );
}
