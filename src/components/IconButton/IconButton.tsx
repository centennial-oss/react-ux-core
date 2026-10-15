import type { Ref } from 'react';
import {
  Button as AriaButton,
  ToggleButton as AriaToggleButton,
  type ButtonProps as AriaButtonProps,
  type ToggleButtonProps as AriaToggleButtonProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { Size, Tone } from '../../utils/types';
import { SpinnerIcon } from '../Spinner/SpinnerIcon';
import { usePressRepeat } from './usePressRepeat';

export type IconButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost';

const sizeClasses: Record<Size, string> = { sm: 'size-8', md: 'size-10', lg: 'size-12' };
const iconSizeClasses: Record<Size, string> = { sm: 'size-4', md: 'size-5', lg: 'size-6' };

const baseClasses = [
  'hit-area inline-flex shrink-0 items-center justify-center rounded-control cursor-pointer select-none',
  'transition-[background-color,border-color,color] duration-(--duration-fast) ease-standard',
  'data-focus-visible:focus-ring data-disabled:cursor-not-allowed data-disabled:opacity-50 data-pending:cursor-wait',
  'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0',
  'data-hovered:after:opacity-[0.08] data-pressed:after:opacity-[0.14]',
].join(' ');

const variantToneClasses: Record<IconButtonVariant, Record<Tone, string>> = {
  solid: {
    neutral: 'bg-neutral-solid text-neutral-on-solid',
    accent: 'bg-accent-solid text-accent-on-solid',
    success: 'bg-success-solid text-success-on-solid',
    warning: 'bg-warning-solid text-warning-on-solid',
    danger: 'bg-danger-solid text-danger-on-solid',
  },
  soft: {
    neutral: 'bg-neutral-bg text-neutral-fg',
    accent: 'bg-accent-bg text-accent-fg',
    success: 'bg-success-bg text-success-fg',
    warning: 'bg-warning-bg text-warning-fg',
    danger: 'bg-danger-bg text-danger-fg',
  },
  outline: {
    neutral: 'border border-neutral-border text-neutral-fg',
    accent: 'border border-accent-border text-accent-fg',
    success: 'border border-success-border text-success-fg',
    warning: 'border border-warning-border text-warning-fg',
    danger: 'border border-danger-border text-danger-fg',
  },
  ghost: {
    neutral: 'text-neutral-fg',
    accent: 'text-accent-fg',
    success: 'text-success-fg',
    warning: 'text-warning-fg',
    danger: 'text-danger-fg',
  },
};

/** A selected toggle shows as the solid version of its tone. */
const selectedClasses: Record<Tone, string> = {
  neutral:
    'data-selected:border-transparent data-selected:bg-neutral-solid data-selected:text-neutral-on-solid',
  accent:
    'data-selected:border-transparent data-selected:bg-accent-solid data-selected:text-accent-on-solid',
  success:
    'data-selected:border-transparent data-selected:bg-success-solid data-selected:text-success-on-solid',
  warning:
    'data-selected:border-transparent data-selected:bg-warning-solid data-selected:text-warning-on-solid',
  danger:
    'data-selected:border-transparent data-selected:bg-danger-solid data-selected:text-danger-on-solid',
};

interface IconButtonOwnProps {
  icon: IconComponent;
  /** Required: an icon-only button has no visible text, so this is its name. */
  'aria-label': string;
  /** Defaults to `ghost`. */
  variant?: IconButtonVariant;
  /** Defaults to `neutral`. */
  tone?: Tone;
  /** Defaults to `md`. */
  size?: Size;
  className?: string;
}

type ReplacedProps = 'className' | 'style' | 'children' | 'render' | 'aria-label';

/** An icon-only action button. */
export interface IconButtonActionProps
  extends IconButtonOwnProps, Omit<AriaButtonProps, ReplacedProps> {
  isSelected?: never;
  defaultSelected?: never;
  /**
   * Press-and-hold repeat: called once when the press starts and repeatedly while it's held (mouse, touch, or a held
   * Space or Enter). Use instead of `onPress` for steppers and nudges.
   */
  onRepeat?: () => void;
  /** Milliseconds before repeating starts. Defaults to 400. */
  repeatDelay?: number;
  /** Milliseconds between repeats. Defaults to 60. */
  repeatInterval?: number;
  ref?: Ref<HTMLButtonElement>;
}

/** An icon-only toggle button (`aria-pressed`). Controlled with `isSelected` or uncontrolled with `defaultSelected`. */
export interface IconButtonToggleProps
  extends IconButtonOwnProps, Omit<AriaToggleButtonProps, ReplacedProps> {
  onRepeat?: never;
  repeatDelay?: never;
  repeatInterval?: never;
  isPending?: never;
  ref?: Ref<HTMLButtonElement>;
}

export type IconButtonProps = IconButtonActionProps | IconButtonToggleProps;

function isToggle(props: IconButtonProps): props is IconButtonToggleProps {
  return props.isSelected !== undefined || props.defaultSelected !== undefined;
}

/** A button that shows only an icon. Its `aria-label` is required by its type. */
export function IconButton(props: IconButtonProps) {
  const { icon: Icon, variant = 'ghost', tone = 'neutral', size = 'md', className } = props;
  const classes = cn(
    baseClasses,
    sizeClasses[size],
    variantToneClasses[variant][tone],
    selectedClasses[tone],
    className,
  );
  const icon = <Icon aria-hidden="true" className={iconSizeClasses[size]} />;

  if (isToggle(props)) {
    const {
      icon: _icon,
      variant: _variant,
      tone: _tone,
      size: _size,
      className: _className,
      ...toggleProps
    } = props;
    return (
      <AriaToggleButton {...toggleProps} className={classes}>
        {icon}
      </AriaToggleButton>
    );
  }

  return <ActionIconButton {...props} classes={classes} icon={Icon} size={size} />;
}

function ActionIconButton({
  icon: Icon,
  size,
  classes,
  variant: _variant,
  tone: _tone,
  className: _className,
  onRepeat,
  repeatDelay = 400,
  repeatInterval = 60,
  isPending = false,
  onPressStart,
  onPressEnd,
  onBlur,
  ...rest
}: IconButtonActionProps & { classes: string; size: Size }) {
  const repeat = usePressRepeat({
    onRepeat,
    delay: repeatDelay,
    interval: repeatInterval,
    isDisabled: rest.isDisabled === true || isPending,
  });

  return (
    <AriaButton
      {...rest}
      isPending={isPending}
      className={classes}
      onPressStart={(event) => {
        repeat.onPressStart();
        onPressStart?.(event);
      }}
      onPressEnd={(event) => {
        repeat.onPressEnd();
        onPressEnd?.(event);
      }}
      onBlur={(event) => {
        repeat.onBlur();
        onBlur?.(event);
      }}
      render={(domProps) => <button {...domProps} aria-busy={isPending || undefined} />}
    >
      {isPending ? (
        <SpinnerIcon className={iconSizeClasses[size]} />
      ) : (
        <Icon aria-hidden="true" className={iconSizeClasses[size]} />
      )}
    </AriaButton>
  );
}
