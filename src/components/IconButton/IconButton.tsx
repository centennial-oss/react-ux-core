import type { Ref } from 'react';
import {
  Button as AriaButton,
  ToggleButton as AriaToggleButton,
  type ButtonProps as AriaButtonProps,
  type ToggleButtonProps as AriaToggleButtonProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { disabledClasses, pressTintClasses } from '../../utils/stateClasses';
import {
  toneOutlineClasses,
  toneSelectedClasses,
  toneSolidClasses,
  toneSoftClasses,
  toneTextClasses,
} from '../../utils/toneClasses';
import type { Size, Tone } from '../../utils/types';
import {
  iconOnlyIconSizeClasses as iconSizeClasses,
  iconOnlySizeClasses as sizeClasses,
} from '../Button/Button.styles';
import { SpinnerIcon } from '../Spinner/SpinnerIcon';
import { usePressRepeat } from './usePressRepeat';

export type IconButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost';

const baseClasses = [
  'hit-area inline-flex shrink-0 items-center justify-center rounded-control cursor-pointer select-none',
  'transition-[background-color,border-color,color] duration-(--duration-fast) ease-standard',
  'data-focus-visible:focus-ring',
  disabledClasses,
  'data-pending:cursor-wait',
  pressTintClasses,
].join(' ');

const variantToneClasses: Record<IconButtonVariant, Record<Tone, string>> = {
  solid: toneSolidClasses,
  soft: toneSoftClasses,
  outline: toneOutlineClasses,
  ghost: toneTextClasses,
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
    toneSelectedClasses[tone],
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
