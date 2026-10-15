import { Menu as MenuIcon } from 'lucide-react';
import { useMemo, useSyncExternalStore, type Ref } from 'react';
import {
  Button as AriaButton,
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
} from 'react-aria-components';
import { useLinkComponent } from '../provider/context';
import { cn } from '../utils/cn';
import { findActiveId } from './navigation';
import { useShell } from './ShellContext';
import type { BottomTabItem } from './types';
import { useShellMessages } from './messages';

// The visual viewport shrinks well below the layout viewport while an on-screen keyboard is open.
const KEYBOARD_THRESHOLD = 0.75;

function subscribeToViewport(onChange: () => void) {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', onChange);
  return () => {
    viewport?.removeEventListener('resize', onChange);
  };
}

function isKeyboardOpenNow(): boolean {
  const viewport = window.visualViewport;
  return viewport !== null && viewport.height < window.innerHeight * KEYBOARD_THRESHOLD;
}

/** Whether an on-screen keyboard is open, from the visual viewport's resize events. */
export function useIsKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribeToViewport, isKeyboardOpenNow, () => false);
}

export interface BottomTabBarProps {
  /** Up to five items (four with `hasMoreButton`). */
  items: readonly BottomTabItem[];
  /** The current location, from the app's router. */
  currentPath?: string;
  isActive?: (item: BottomTabItem) => boolean;
  /** Adds a last "More" item that opens the AppShell's navigation drawer. */
  hasMoreButton?: boolean;
  /** Names the navigation landmark. Defaults to the `quickNavigation` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const itemClasses = [
  'relative flex min-h-hit min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.6875rem] leading-tight outline-none',
  'text-fg-muted data-pressed:text-fg data-focus-visible:focus-ring data-focus-visible:rounded-control',
  'aria-[current=page]:font-semibold aria-[current=page]:text-accent-fg',
].join(' ');

/**
 * The phone tab bar: up to five destinations at the bottom of the screen, above the safe area. It hides while the
 * on-screen keyboard is open, and on tablet and desktop. "More" (`hasMoreButton`) opens the navigation drawer.
 */
export function BottomTabBar({
  items,
  currentPath,
  isActive,
  hasMoreButton = false,
  'aria-label': ariaLabel,
  className,
  ref,
}: BottomTabBarProps) {
  const messages = useShellMessages();
  const LinkComponent = useLinkComponent();
  const shell = useShell();
  const isKeyboardOpen = useIsKeyboardOpen();
  const shown = items.slice(0, hasMoreButton ? 4 : 5);
  const activeId = useMemo(
    () => findActiveId(shown, currentPath, isActive),
    [shown, currentPath, isActive],
  );
  const render: NonNullable<AriaLinkProps['render']> = (props) =>
    'href' in props ? <LinkComponent {...props} /> : <span {...props} />;
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel ?? messages.quickNavigation}
      hidden={isKeyboardOpen}
      className={cn(
        'fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-surface-2 pb-[env(safe-area-inset-bottom)] sm:hidden',
        className,
      )}
    >
      <ul className="flex h-bottom-bar items-stretch">
        {shown.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <AriaLink
                href={item.href}
                aria-current={item.id === activeId ? 'page' : undefined}
                render={render}
                className={itemClasses}
              >
                <span className="relative">
                  <Icon aria-hidden="true" className="size-6" />
                  {item.badge !== undefined && (
                    <span className="absolute -end-2 -top-1 min-w-4 rounded-full bg-accent-solid px-1 text-center text-[0.625rem] leading-4 font-medium text-accent-on-solid">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </AriaLink>
            </li>
          );
        })}
        {hasMoreButton && (
          <li className="flex min-w-0 flex-1">
            <AriaButton
              aria-expanded={shell?.isNavOpen ?? false}
              onPress={() => {
                shell?.setNavOpen(true);
              }}
              className={itemClasses}
            >
              <MenuIcon aria-hidden="true" className="size-6" />
              <span className="max-w-full truncate">{messages.more}</span>
            </AriaButton>
          </li>
        )}
      </ul>
    </nav>
  );
}
