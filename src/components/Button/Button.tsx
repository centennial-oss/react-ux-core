import type { ReactNode, Ref } from 'react';
import {
  Button as AriaButton,
  Link as AriaLink,
  type ButtonProps as AriaButtonProps,
  type LinkProps as AriaLinkProps,
} from 'react-aria-components';
import { useLinkComponent } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { SpinnerIcon } from '../Spinner/SpinnerIcon';
import {
  baseClasses,
  iconSizeClasses,
  linkSizeClasses,
  sizeClasses,
  variantToneClasses,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from './Button.styles';

export type { ButtonSize, ButtonTone, ButtonVariant };

interface ButtonOwnProps {
  /** Visual weight. Defaults to `solid`. */
  variant?: ButtonVariant;
  /** Colour role. Defaults to `neutral`. */
  tone?: ButtonTone;
  /** Defaults to `md`. */
  size?: ButtonSize;
  /** An icon component, such as one from lucide-react. */
  icon?: IconComponent;
  /** Which side of the label the icon sits on. Defaults to `start`. */
  iconPosition?: 'start' | 'end';
  /** Classes for the root element. Later classes win over the component's own. */
  className?: string;
  children?: ReactNode;
}

type ReplacedProps = 'className' | 'style' | 'children' | 'render';

/** A button that performs an action. */
export interface ButtonAsButtonProps extends ButtonOwnProps, Omit<AriaButtonProps, ReplacedProps> {
  href?: never;
  /** Shows a spinner, keeps the button's width, sets `aria-busy` and blocks presses. */
  isPending?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** A link styled as a button. Renders through `UIProvider`'s `LinkComponent`. */
export interface ButtonAsLinkProps extends ButtonOwnProps, Omit<AriaLinkProps, ReplacedProps> {
  href: string;
  isPending?: never;
  ref?: Ref<HTMLAnchorElement>;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

function Content({
  icon: Icon,
  iconPosition,
  size,
  isPending,
  children,
}: Pick<ButtonOwnProps, 'icon' | 'iconPosition' | 'children'> & {
  size: ButtonSize;
  isPending: boolean;
}) {
  const icon = Icon ? (
    <Icon aria-hidden="true" className={cn('shrink-0', iconSizeClasses[size])} />
  ) : null;
  return (
    <>
      {/* While pending, the label stays in the layout (keeping the width) and in the accessible name, but invisible. */}
      <span className={cn('inline-flex items-center gap-[inherit]', isPending && 'opacity-0')}>
        {iconPosition === 'start' && icon}
        {children}
        {iconPosition === 'end' && icon}
      </span>
      {isPending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <SpinnerIcon className={iconSizeClasses[size]} />
        </span>
      )}
    </>
  );
}

/**
 * Buttons perform actions; with `href` they navigate. Built on React Aria's Button and Link, so press,
 * keyboard and focus behaviour work the same on mouse, touch and keyboard.
 */
export function Button({
  variant = 'solid',
  tone = 'neutral',
  size = 'md',
  icon,
  iconPosition = 'start',
  className,
  children,
  ...rest
}: ButtonProps) {
  const LinkComponent = useLinkComponent();
  const classes = cn(
    baseClasses,
    variant === 'link' ? linkSizeClasses[size] : sizeClasses[size],
    variantToneClasses[variant][tone],
    className,
  );

  if (rest.href !== undefined) {
    const { isPending: _isPending, ...linkProps } = rest;
    return (
      <AriaLink
        {...linkProps}
        className={classes}
        render={(domProps) =>
          'href' in domProps ? <LinkComponent {...domProps} /> : <span {...domProps} />
        }
      >
        <Content icon={icon} iconPosition={iconPosition} size={size} isPending={false}>
          {children}
        </Content>
      </AriaLink>
    );
  }

  const { href: _href, isPending = false, ...buttonProps } = rest;
  return (
    <AriaButton
      {...buttonProps}
      isPending={isPending}
      className={classes}
      // React Aria marks a pending button aria-disabled but not aria-busy; we set aria-busy too.
      render={(domProps) => <button {...domProps} aria-busy={isPending || undefined} />}
    >
      <Content icon={icon} iconPosition={iconPosition} size={size} isPending={isPending}>
        {children}
      </Content>
    </AriaButton>
  );
}
