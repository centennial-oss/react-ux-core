import { useId, type ReactNode, type Ref } from 'react';
import { Button as AriaButton, type Key } from 'react-aria-components';
import { Avatar } from '../components/Avatar/Avatar';
import { Menu, MenuSeparator, MenuTrigger } from '../components/Menu/Menu';

import { cn } from '../utils/cn';
import { useCompactActions } from './Header';
import { useShellMessages } from './messages';

// Kept here too, since `/shell` has always exported it.
export { initialsOf } from '../components/Avatar/avatarColors';

export interface UserMenuProps {
  /** The signed-in user's name. It heads the menu and names the trigger. */
  name: string;
  /** A second line under the name, for example the current organisation and role. */
  secondary?: ReactNode;
  /** A picture of the user. Without one (or if it fails to load), the trigger shows initials. */
  avatarSrc?: string;
  /** Overrides the initials taken from `name`. */
  initials?: string;
  /** The menu's sections (`MenuSection`, `MenuItem`, `MenuSeparator`), for example profile and sign out. */
  children?: ReactNode;
  /** Called with the `id` of the chosen item. */
  onAction?: (key: Key) => void;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The account menu: an avatar or initials that opens a menu headed by the user's name and a secondary line, then
 * the app's sections. Inside a Header on phones, it also lists the header's `compactActions`.
 */
export function UserMenu({
  name,
  secondary,
  avatarSrc,
  initials,
  children,
  onAction,
  className,
  ref,
}: UserMenuProps) {
  const messages = useShellMessages();
  const compactActions = useCompactActions();
  const nameId = useId();
  const hasCompactActions = compactActions !== undefined && compactActions !== null;
  return (
    <MenuTrigger>
      <AriaButton
        ref={ref}
        aria-label={messages.accountMenu({ name })}
        className={cn(
          'hit-area flex size-9 shrink-0 cursor-default items-center justify-center rounded-full outline-none',
          'data-focus-visible:focus-ring data-hovered:brightness-95 data-pressed:brightness-90',
          className,
        )}
      >
        {/* The button is named by the account, so the avatar inside is just its picture. It fills the button, which
            an app's className may resize. */}
        <Avatar
          name={name}
          src={avatarSrc}
          initials={initials}
          color="accent"
          aria-hidden="true"
          className="size-full"
        />
      </AriaButton>
      <Menu
        aria-labelledby={nameId}
        onAction={onAction}
        header={
          <div className="flex min-w-0 flex-col">
            <span id={nameId} className="truncate text-sm font-semibold text-fg">
              {name}
            </span>
            {secondary !== undefined && (
              <span className="truncate text-xs text-fg-muted">{secondary}</span>
            )}
          </div>
        }
      >
        {children}
        {hasCompactActions && children !== undefined && <MenuSeparator />}
        {hasCompactActions && compactActions}
      </Menu>
    </MenuTrigger>
  );
}
