import { ChevronDown, EllipsisVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { Size, Tone } from '../../utils/types';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Menu, MenuTrigger } from './Menu';

interface MenuOpenProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

interface MenuActionProps {
  /** Called with the `id` of the chosen item. */
  onAction?: (key: Key) => void;
  /** Keys of items that can't be chosen. */
  disabledKeys?: Iterable<Key>;
  /** Accessible name for the menu. Defaults to the trigger's label. */
  menuLabel?: string;
}

export interface MenuButtonProps extends MenuOpenProps, MenuActionProps {
  /** The button's text. */
  label: ReactNode;
  /** The menu's items (`MenuItem`, `MenuSection`, `MenuSeparator`). */
  children: ReactNode;
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  tone?: Tone;
  size?: Size;
  icon?: IconComponent;
  isDisabled?: boolean;
  className?: string;
}

/** A button that opens a menu of related actions. */
export function MenuButton({
  label,
  children,
  onAction,
  disabledKeys,
  menuLabel,
  variant = 'outline',
  tone = 'neutral',
  size = 'md',
  icon,
  isDisabled,
  className,
  ...openProps
}: MenuButtonProps) {
  return (
    <MenuTrigger {...openProps}>
      <Button
        variant={variant}
        tone={tone}
        size={size}
        icon={icon}
        isDisabled={isDisabled}
        className={className}
      >
        {label}
        <ChevronDown aria-hidden="true" className="-me-1 size-4 shrink-0" />
      </Button>
      <Menu aria-label={menuLabel} onAction={onAction} disabledKeys={disabledKeys}>
        {children}
      </Menu>
    </MenuTrigger>
  );
}

export interface SplitButtonProps extends MenuOpenProps, MenuActionProps {
  /** The primary action's text. */
  label: ReactNode;
  /** The primary action. */
  onPress: () => void;
  /** The related actions (`MenuItem`, `MenuSection`, `MenuSeparator`). */
  children: ReactNode;
  /** Label for the menu button. Defaults to the `moreOptions` message ("More options"). */
  menuTriggerLabel?: string;
  variant?: 'solid' | 'soft' | 'outline';
  tone?: Tone;
  size?: Size;
  icon?: IconComponent;
  isDisabled?: boolean;
  isPending?: boolean;
  className?: string;
}

/** A primary action joined to a menu of related actions. */
export function SplitButton({
  label,
  onPress,
  children,
  onAction,
  disabledKeys,
  menuLabel,
  menuTriggerLabel,
  variant = 'solid',
  tone = 'accent',
  size = 'md',
  icon,
  isDisabled,
  isPending,
  className,
  ...openProps
}: SplitButtonProps) {
  const messages = useCommonMessages();
  return (
    <div className={cn('inline-flex items-stretch', className)}>
      <Button
        variant={variant}
        tone={tone}
        size={size}
        icon={icon}
        isDisabled={isDisabled}
        isPending={isPending}
        onPress={onPress}
        className="rounded-e-none"
      >
        {label}
      </Button>
      <MenuTrigger {...openProps}>
        <IconButton
          icon={ChevronDown}
          aria-label={menuTriggerLabel ?? messages.moreOptions}
          variant={variant}
          tone={tone}
          size={size}
          isDisabled={isDisabled}
          className={cn(
            'rounded-s-none border-s border-s-current/25',
            variant === 'outline' && '-ms-px',
          )}
        />
        <Menu aria-label={menuLabel} onAction={onAction} disabledKeys={disabledKeys}>
          {children}
        </Menu>
      </MenuTrigger>
    </div>
  );
}

export interface OverflowMenuProps extends MenuOpenProps, MenuActionProps {
  /** The quick actions (`MenuItem`, `MenuSection`, `MenuSeparator`). */
  children: ReactNode;
  /** Label for the trigger. Defaults to the `moreActions` message ("More actions"). */
  'aria-label'?: string;
  size?: Size;
  isDisabled?: boolean;
  className?: string;
}

/** A "more actions" button (vertical dots) that opens a menu, for row, card and page quick actions. */
export function OverflowMenu({
  children,
  onAction,
  disabledKeys,
  menuLabel,
  'aria-label': ariaLabel,
  size = 'md',
  isDisabled,
  className,
  ...openProps
}: OverflowMenuProps) {
  const messages = useCommonMessages();
  return (
    <MenuTrigger {...openProps}>
      <IconButton
        icon={EllipsisVertical}
        aria-label={ariaLabel ?? messages.moreActions}
        size={size}
        isDisabled={isDisabled}
        className={className}
      />
      <Menu aria-label={menuLabel} onAction={onAction} disabledKeys={disabledKeys}>
        {children}
      </Menu>
    </MenuTrigger>
  );
}
