import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useMemo, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
  ButtonContext,
  HeadingContext,
  ListBox,
  ListBoxItem,
  Provider,
  TextContext,
  type Key,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { calendarStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { mod } from '../../utils/math';
import {
  controlHeightClasses,
  disabledClasses,
  hoverSurfaceClasses,
  pressTintClasses,
  selectedSolidClasses,
} from '../../utils/stateClasses';
import { useControllableState } from '../../utils/useControllableState';
import { IconButton } from '../IconButton/IconButton';
import { Popover, PopoverTrigger } from '../Popover/Popover';

export type CyclerSize = 'sm' | 'md';

export interface CyclerOption<T extends Key = string> {
  /** The value `onChange` reports when this option is chosen. */
  id: T;
  label: string;
  /** Skipped by the arrows and can't be picked. */
  isDisabled?: boolean;
  /**
   * Splits a long list into pages of the picker, for example years by decade. Neighbouring options with the same
   * group share a page, and the group is its heading. Without groups the picker shows every option at once.
   */
  group?: string;
}

/** Controlled (`value`) or uncontrolled (`defaultValue`), never both. */
type CyclerValueProps<T extends Key> =
  | {
      /** The current option's id, controlled. */
      value: NoInfer<T>;
      defaultValue?: never;
    }
  | {
      value?: never;
      /** The initial option's id, uncontrolled. Defaults to the first enabled option. */
      defaultValue?: NoInfer<T>;
    };

/** The cycler needs an accessible name: `aria-label`, or `aria-labelledby` pointing at a visible label. */
type CyclerLabelProps =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };

interface CyclerBaseProps<T extends Key> {
  /** The values, in order. */
  options: readonly CyclerOption<T>[];
  /** Called with the new option's id, from the arrows or the picker. */
  onChange?: (value: NoInfer<T>) => void;
  /** The arrows wrap from the last option to the first and back. Defaults to true. */
  isLooping?: boolean;
  /** Pressing the value opens a grid of every option to jump to. Defaults to true. */
  hasPicker?: boolean;
  /** Columns in the picker's grid. Defaults to 3. */
  pickerColumns?: number;
  /**
   * Takes over the arrows, for values that run past `options`: months that roll into the next year, say. The arrows
   * call this instead of stepping through `options`; set the value from it, and limit it with `isPreviousDisabled`
   * and `isNextDisabled`.
   */
  onStep?: (direction: 'previous' | 'next') => void;
  /** Disables the previous arrow, on top of the cycler's own limits. */
  isPreviousDisabled?: boolean;
  /** Disables the next arrow, on top of the cycler's own limits. */
  isNextDisabled?: boolean;
  /** Defaults to `md`. On touch screens the arrows grow to the minimum touch target. */
  size?: CyclerSize;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export type CyclerProps<T extends Key = string> = CyclerBaseProps<T> &
  CyclerValueProps<T> &
  CyclerLabelProps;

const valueButtonClasses = [
  'relative inline-grid min-w-0 items-center justify-items-center self-stretch rounded-control px-1.5 text-sm font-semibold whitespace-nowrap text-fg outline-none select-none',
  'data-focus-visible:focus-ring',
  pressTintClasses,
  'data-disabled:cursor-not-allowed',
].join(' ');

const optionClasses = [
  'flex min-h-9 cursor-pointer items-center justify-center rounded-control px-2 text-sm whitespace-nowrap text-fg tabular-nums outline-none select-none max-sm:min-h-hit max-sm:text-base',
  hoverSurfaceClasses,
  'data-focus-visible:focus-ring',
  selectedSolidClasses,
  'data-selected:font-semibold',
  disabledClasses,
].join(' ');

/** The slide that brings in a new value, from the side the arrow points away from. Flipped right to left. */
const slideClasses = {
  previous:
    'animate-[rux-slide-in-from-start_var(--duration-normal)_var(--ease-standard)] rtl:animate-[rux-slide-in-from-end_var(--duration-normal)_var(--ease-standard)]',
  next: 'animate-[rux-slide-in-from-end_var(--duration-normal)_var(--ease-standard)] rtl:animate-[rux-slide-in-from-start_var(--duration-normal)_var(--ease-standard)]',
} as const;

/**
 * The nearest enabled option from `index` in `direction`, wrapping past the ends when `isWrapping` (the `isLooping` prop), or -1 when there's
 * none. With no current option (`index` -1) it starts from the end it moves away from.
 */
function adjacentIndex<T extends Key>(
  options: readonly CyclerOption<T>[],
  index: number,
  direction: 1 | -1,
  isWrapping: boolean,
): number {
  const count = options.length;
  const start = index >= 0 ? index : direction === 1 ? -1 : count;
  for (let step = 1; step <= count; step += 1) {
    let next = start + direction * step;
    if (next < 0 || next >= count) {
      if (!isWrapping) {
        return -1;
      }
      next = mod(next, count);
    }
    if (next === index) {
      return -1;
    }
    if (options[next]?.isDisabled !== true) {
      return next;
    }
  }
  return -1;
}

interface Page<T extends Key> {
  group: string | undefined;
  options: CyclerOption<T>[];
}

/** Neighbouring options with the same `group` form a page. */
function paginate<T extends Key>(options: readonly CyclerOption<T>[]): Page<T>[] {
  const pages: Page<T>[] = [];
  for (const option of options) {
    const last = pages.at(-1);
    if (last && last.group === option.group) {
      last.options.push(option);
    } else {
      pages.push({ group: option.group, options: [option] });
    }
  }
  return pages;
}

/**
 * Steps through a list of values with previous and next arrows, like a month or a year, and jumps straight to one
 * from a grid that opens from the value. Hold an arrow to keep stepping. Long lists, such as a century of years, page
 * through the grid by `group`.
 */
export function Cycler<T extends Key>(props: CyclerProps<T>) {
  const {
    options,
    value,
    defaultValue,
    onChange,
    isLooping: isWrapping = true,
    hasPicker = true,
    pickerColumns = 3,
    onStep,
    isPreviousDisabled = false,
    isNextDisabled = false,
    size = 'md',
    isDisabled = false,
    className,
    ref,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  } = props;
  const messages = useEntryMessages(calendarStrings);
  const groupId = useId();
  const [current, setCurrent] = useControllableState<T | undefined>(
    value,
    defaultValue ?? options.find((option) => option.isDisabled !== true)?.id,
  );
  const index = options.findIndex((option) => option.id === current);
  const currentOption = options[index];

  // Which way the last arrow went, and a counter so a repeat in the same direction slides again.
  const [slide, setSlide] = useState<{ direction: 'previous' | 'next'; count: number } | null>(
    null,
  );

  const choose = (next: T) => {
    if (next !== current) {
      setCurrent(next);
      onChange?.(next);
    }
  };

  const previousIndex = adjacentIndex(options, index, -1, isWrapping);
  const nextIndex = adjacentIndex(options, index, 1, isWrapping);
  const canGoPrevious =
    !isDisabled && !isPreviousDisabled && (onStep !== undefined || previousIndex >= 0);
  const canGoNext = !isDisabled && !isNextDisabled && (onStep !== undefined || nextIndex >= 0);

  const step = (direction: 'previous' | 'next') => {
    setSlide((last) => ({ direction, count: (last?.count ?? 0) + 1 }));
    if (onStep) {
      onStep(direction);
      return;
    }
    const target = options[direction === 'previous' ? previousIndex : nextIndex];
    if (target) {
      choose(target.id);
    }
  };

  const labelProps = {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  };

  const valueFace = (
    // Every label sits in the same grid cell, invisible but the current one, so the cycler is as wide as its widest
    // value and the arrows don't move as it changes.
    <>
      {options.map((option) => (
        <span key={option.id} aria-hidden="true" className="invisible [grid-area:1/1]">
          {option.label}
        </span>
      ))}
      {/* Arrows keep focus, so the value is a live region that announces where they step to. It stays mounted (only
          the text inside restarts its slide), since a newly added live region isn't announced. */}
      <span aria-live="polite" className="[grid-area:1/1]">
        <span
          key={slide?.count ?? 0}
          className={cn('inline-block', slide && slideClasses[slide.direction])}
        >
          {currentOption?.label}
        </span>
      </span>
    </>
  );

  return (
    // Clears contexts a surrounding component may provide (a calendar's previous/next button slots, say), which would
    // otherwise reach the buttons inside.
    <Provider
      values={[
        [ButtonContext, null],
        [HeadingContext, null],
        [TextContext, null],
      ]}
    >
      <div
        ref={ref}
        role="group"
        id={groupId}
        {...labelProps}
        aria-disabled={isDisabled || undefined}
        className={cn(
          'inline-flex max-w-full items-center rounded-control border border-border-strong bg-surface-2',
          controlHeightClasses[size],
          isDisabled && 'opacity-50',
          className,
        )}
      >
        <IconButton
          icon={ChevronLeft}
          aria-label={messages.cyclePrevious}
          size="sm"
          isDisabled={!canGoPrevious}
          onRepeat={() => {
            step('previous');
          }}
          repeatDelay={400}
          repeatInterval={150}
          className={cn(
            'h-full w-8 rounded-e-none max-sm:w-11 [&_svg]:rtl:rotate-180',
            size === 'md' && 'w-9',
            // A disabled cycler fades as a whole, so its arrows don't fade again.
            isDisabled && 'data-disabled:opacity-100',
          )}
        />
        {hasPicker ? (
          <CyclerPicker
            options={options}
            current={current}
            columns={pickerColumns}
            isDisabled={isDisabled}
            labelledBy={groupId}
            onChoose={(next) => {
              setSlide(null);
              choose(next);
            }}
          >
            {valueFace}
          </CyclerPicker>
        ) : (
          <span className="inline-grid min-w-0 items-center justify-items-center px-1.5 text-sm font-semibold whitespace-nowrap text-fg">
            {valueFace}
          </span>
        )}
        <IconButton
          icon={ChevronRight}
          aria-label={messages.cycleNext}
          size="sm"
          isDisabled={!canGoNext}
          onRepeat={() => {
            step('next');
          }}
          repeatDelay={400}
          repeatInterval={150}
          className={cn(
            'h-full w-8 rounded-s-none max-sm:w-11 [&_svg]:rtl:rotate-180',
            size === 'md' && 'w-9',
            isDisabled && 'data-disabled:opacity-100',
          )}
        />
      </div>
    </Provider>
  );
}

interface CyclerPickerProps<T extends Key> {
  options: readonly CyclerOption<T>[];
  current: T | undefined;
  columns: number;
  isDisabled: boolean;
  /** The cycler's group, which names the button and the picker. */
  labelledBy: string;
  onChoose: (value: T) => void;
  /** The value shown on the button. */
  children: ReactNode;
}

/** The value as a button that opens a grid of every option (a page at a time when they're grouped). */
function CyclerPicker<T extends Key>({
  options,
  current,
  columns,
  isDisabled,
  labelledBy,
  onChoose,
  children,
}: CyclerPickerProps<T>) {
  const messages = useEntryMessages(calendarStrings);
  const buttonId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const pages = useMemo(() => paginate(options), [options]);
  const currentPage = Math.max(
    0,
    pages.findIndex((page) => page.options.some((option) => option.id === current)),
  );
  const [pageIndex, setPageIndex] = useState(currentPage);
  const page = pages[pageIndex] ?? pages[0];
  const hasPages = pages.length > 1;

  return (
    <PopoverTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        // Every opening starts on the page with the current value.
        if (open) {
          setPageIndex(currentPage);
        }
        setIsOpen(open);
      }}
    >
      <AriaButton
        id={buttonId}
        isDisabled={isDisabled}
        // The button reads as the cycler's name and its value, e.g. "Month, March".
        aria-labelledby={`${labelledBy} ${buttonId}`}
        className={cn(valueButtonClasses, !isDisabled && 'cursor-pointer')}
      >
        {children}
      </AriaButton>
      <Popover aria-labelledby={labelledBy} placement="bottom" className="flex flex-col gap-2">
        {hasPages && page && (
          <div className="flex items-center gap-1">
            <IconButton
              icon={ChevronLeft}
              aria-label={messages.cyclePreviousPage}
              size="sm"
              isDisabled={pageIndex === 0}
              onPress={() => {
                setPageIndex((index) => index - 1);
              }}
              className="[&_svg]:rtl:rotate-180"
            />
            <span
              aria-live="polite"
              className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-fg"
            >
              {page.group}
            </span>
            <IconButton
              icon={ChevronRight}
              aria-label={messages.cycleNextPage}
              size="sm"
              isDisabled={pageIndex === pages.length - 1}
              onPress={() => {
                setPageIndex((index) => index + 1);
              }}
              className="[&_svg]:rtl:rotate-180"
            />
          </div>
        )}
        <ListBox
          aria-labelledby={labelledBy}
          layout="grid"
          selectionMode="single"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the picker opens to choose, so focus starts on the current option.
          autoFocus
          items={page?.options ?? []}
          selectedKeys={current === undefined ? [] : [current]}
          disabledKeys={options
            .filter((option) => option.isDisabled === true)
            .map((option) => option.id)}
          // Pressing the current option deselects it here (selection is controlled, so it stays): just close.
          onSelectionChange={(keys) => {
            const [key] = keys === 'all' ? [] : [...keys];
            if (key !== undefined) {
              onChoose(key as T);
            }
            setIsOpen(false);
          }}
          // The column count is the app's value, so it's passed as a custom property.
          // eslint-disable-next-line no-restricted-syntax
          style={{ '--cycler-columns': String(Math.max(1, Math.floor(columns))) } as CSSProperties}
          className="grid grid-cols-[repeat(var(--cycler-columns),minmax(0,1fr))] gap-1 outline-none"
        >
          {(option) => (
            <ListBoxItem id={option.id} textValue={option.label} className={optionClasses}>
              {option.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </PopoverTrigger>
  );
}
