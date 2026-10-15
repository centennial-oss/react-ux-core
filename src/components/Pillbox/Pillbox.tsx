import type { Ref } from 'react';
import { RadioButton, RadioField, RadioGroup, type RadioGroupProps } from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { useControllableState } from '../../utils/useControllableState';

export type PillboxSize = 'sm' | 'md';

export interface PillboxOption<T extends string = string> {
  /** The value `onChange` reports when this option is chosen. */
  id: T;
  /** The visible label, or the accessible name in icon-only mode. */
  label: string;
  icon?: IconComponent;
  isDisabled?: boolean;
}

/** In icon-only mode every option needs an icon; its `label` becomes the button's accessible name. */
type PillboxModeProps<T extends string> =
  | {
      /** Shows only each option's icon, keeping its `label` as the accessible name. */
      isIconOnly?: false;
      /** The choices, in order. Define them inline or `as const` so `onChange` gets the exact union of ids. */
      options: readonly PillboxOption<T>[];
    }
  | {
      isIconOnly: true;
      options: readonly (PillboxOption<T> & { icon: IconComponent })[];
    };

/** Controlled (`value`) or uncontrolled (`defaultValue`), never both. */
type PillboxValueProps<T extends string> =
  | {
      /** The chosen option's id, controlled. */
      value: NoInfer<T>;
      defaultValue?: never;
    }
  | {
      value?: never;
      /** The initially chosen option's id, uncontrolled. Defaults to the first enabled option. */
      defaultValue?: NoInfer<T>;
    };

/** The group needs an accessible name: `aria-label`, or `aria-labelledby` pointing at a visible label. */
type PillboxLabelProps =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };

interface PillboxBaseProps<T extends string> extends Omit<
  RadioGroupProps,
  | 'className'
  | 'style'
  | 'children'
  | 'render'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'orientation'
  | 'aria-label'
  | 'aria-labelledby'
  | 'isInvalid'
  | 'isRequired'
  | 'isReadOnly'
> {
  /** Called with the chosen option's id. */
  onChange?: (value: NoInfer<T>) => void;
  /** Defaults to `md`. */
  size?: PillboxSize;
  /** Disables every option. */
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export type PillboxProps<T extends string = string> = PillboxBaseProps<T> &
  PillboxModeProps<T> &
  PillboxValueProps<T> &
  PillboxLabelProps;

const sizeClasses: Record<PillboxSize, { text: string; iconOnly: string }> = {
  sm: { text: 'h-8 gap-1.5 px-2.5 text-sm', iconOnly: 'h-8 w-8' },
  md: { text: 'h-10 gap-2 px-3 text-sm', iconOnly: 'h-10 w-10' },
};

const pillClasses = [
  // The touch target grows vertically (hit-area) and sideways (min-w-hit), so neighbours' targets never overlap.
  'hit-area relative inline-flex min-w-hit cursor-pointer items-center justify-center font-medium whitespace-nowrap text-fg select-none',
  'group-first/pill:rounded-s-[calc(var(--radius-control)-1px)] group-last/pill:rounded-e-[calc(var(--radius-control)-1px)]',
  'transition-[background-color,color] duration-(--duration-fast) ease-standard',
  'data-selected:bg-accent-solid data-selected:text-accent-on-solid',
  // A tint overlay in the text colour gives hover and pressed feedback whether or not the pill is selected.
  'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0',
  'data-hovered:after:opacity-[0.08] data-pressed:after:opacity-[0.14]',
  'data-focus-visible:z-10 data-focus-visible:focus-ring',
].join(' ');

/**
 * A single choice from a few options, shown as joined buttons, for example a list/grid view switch. It's a radio
 * group with the standard radio keyboard pattern: Tab reaches the chosen option and arrow keys choose the next or
 * previous one. `onChange` receives the option's `id`, typed as the union of the ids in `options`.
 */
export function Pillbox<T extends string>(props: PillboxProps<T>) {
  const {
    options: optionsProp,
    isIconOnly = false,
    value,
    defaultValue,
    onChange,
    size = 'md',
    isDisabled = false,
    className,
    ...rest
  } = props;
  const options: readonly PillboxOption<T>[] = optionsProp;
  const [selected, setSelected] = useControllableState<T | undefined>(
    value,
    defaultValue ?? options.find((option) => option.isDisabled !== true)?.id,
  );

  return (
    <RadioGroup
      {...rest}
      orientation="horizontal"
      isDisabled={isDisabled}
      value={selected ?? null}
      onChange={(next) => {
        const chosen = options.find((option) => option.id === next);
        if (chosen && chosen.id !== selected) {
          setSelected(chosen.id);
          onChange?.(chosen.id);
        }
      }}
      className={cn(
        // Equal columns, each as wide as the widest option; in a narrow (or full-width) group they share the width.
        'inline-grid max-w-full auto-cols-fr grid-flow-col rounded-control border border-border-strong bg-surface-2',
        // A disabled group fades as a whole (border included); otherwise only disabled options fade.
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {options.map(({ id, label, icon: Icon, isDisabled: isOptionDisabled }) => (
        <RadioField
          key={id}
          value={id}
          isDisabled={isOptionDisabled}
          aria-label={isIconOnly ? label : undefined}
          className="group/pill flex border-s border-border-strong first:border-s-0"
        >
          <RadioButton
            className={cn(
              pillClasses,
              'flex-1',
              isDisabled
                ? 'cursor-not-allowed'
                : 'data-disabled:cursor-not-allowed data-disabled:opacity-50',
              isIconOnly ? sizeClasses[size].iconOnly : sizeClasses[size].text,
            )}
          >
            {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
            {!isIconOnly && <span className="min-w-0 truncate">{label}</span>}
          </RadioButton>
        </RadioField>
      ))}
    </RadioGroup>
  );
}
