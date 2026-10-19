// Rating: a star rating input. RatingDisplay (beside it) shows a rating without one, for tables and lists.
//
// It's a slider, following the WAI-ARIA APG's rating slider: one native range input, visually hidden under the icons
// (as in Knob), so it is one tab stop with one value that screen readers announce ("3.5 out of 5") and adjust with
// their own gestures. A slider suits half steps where a radio group doesn't: a radio group needs a radio per value
// (ten for five stars in halves), each read as its own option, and moving through it with arrow keys always selects
// something, so it can't step back to "no rating". The slider steps by halves and its minimum, 0, means no rating.
// React Aria's Slider isn't used because its track sets the nearest step to a press, while a rating takes the icon (or
// half icon) under the pointer, and its value can't be empty.
//
// - Arrow keys step (Left and Right follow the layout direction), PageUp/PageDown move a whole icon, Home and End jump
//   to the ends. With `isClearable`, Delete or Backspace clears, as does choosing the current value again.
// - A pointer takes the icon or half icon under it and previews it on hover; touch can drag along the row.
// - `isReadOnly` keeps the slider focusable and announced (read-only), with the exact value filled (3.7 fills 3.7
//   icons), and still submits it.
//
// The input's step is "any", so a fractional value stays exact in aria-valuenow and in a submitted form; key presses
// and pointers step by `step` themselves, and an adjustment from assistive technology moves one step its way.

import { Star } from 'lucide-react';
import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import { joinIds } from '../../utils/aria';
import { cn } from '../../utils/cn';
import { isRightToLeft } from '../../utils/direction';
import type { IconComponent } from '../../utils/icon';
import { capturePointer } from '../../utils/pointer';
import type { Size, Tone } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { fieldRootClasses, type FieldBaseProps } from '../Field/Field';
import { useFieldIds } from '../Field/PlainField';
import { PlainFieldFrame } from '../Field/PlainFieldFrame';
import { RatingIcons, useRatingValueText } from './RatingIcons';
import { ratingAt, steppedRating } from './ratingMath';

export interface RatingProps extends FieldBaseProps {
  /** The rating, controlled; `null` is no rating. Fractions (3.7) fill exactly. */
  value?: number | null;
  /** The initial rating, uncontrolled. Defaults to `null`. */
  defaultValue?: number | null;
  /** Called with the new rating, or `null` when it's cleared. */
  onChange?: (value: number | null) => void;
  /** The highest rating: the number of icons. Defaults to 5. */
  maxValue?: number;
  /** `0.5` lets the user choose half icons. Defaults to 1. */
  step?: 1 | 0.5;
  /** The icon, drawn outlined when empty and filled in the tone. Defaults to a star. */
  icon?: IconComponent;
  /** Defaults to `md`. */
  size?: Size;
  /** The filled icons' colour. Defaults to `warning` (gold). */
  tone?: Tone;
  /** Lets the user clear the rating: choosing the current value again, or Delete or Backspace. Defaults to false. */
  isClearable?: boolean;
  /** `Intl.NumberFormat` options for the announced value. Defaults to at most one decimal ("3.7 out of 5"). */
  formatOptions?: Intl.NumberFormatOptions;
  isDisabled?: boolean;
  /** Focusable and announced as read-only, but not changeable; the value still submits. */
  isReadOnly?: boolean;
  /** Marks the label as required. */
  isRequired?: boolean;
  /** Marks the rating invalid; shows `errorMessage`. */
  isInvalid?: boolean;
  /** Submits the rating with a form (0 for no rating). */
  name?: string;
  /** The input's id. */
  id?: string;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

// Space around each icon, so every icon is at least 24 px wide to point at (more on touch screens).
const slotClasses: Record<Size, string> = {
  sm: 'mx-1 pointer-coarse:mx-1.5',
  md: 'mx-0.5 pointer-coarse:mx-1.5',
  lg: 'mx-0.5 pointer-coarse:mx-1',
};

/**
 * A star rating input: a slider whose arrow keys step, and where a pointer takes the icon (or half icon with
 * `step={0.5}`) under it, with a hover preview. `isClearable` lets choosing the current value again clear it, and
 * `isReadOnly` keeps it focusable but unchangeable. `icon`, `size` and `tone` change the look. To show a rating in a
 * table or list, use RatingDisplay.
 */
export function Rating({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  value: valueProp,
  defaultValue = null,
  onChange,
  maxValue = 5,
  step = 1,
  icon = Star,
  size = 'md',
  tone = 'warning',
  isClearable = false,
  formatOptions,
  isDisabled = false,
  isReadOnly = false,
  isRequired,
  isInvalid = false,
  name,
  id,
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  className,
  ref,
}: RatingProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onChange);
  // The value under a hovering or dragging pointer, shown instead of the value until it leaves or lets go.
  const [preview, setPreview] = useState<number | null>(null);
  const valueText = useRatingValueText(value, maxValue, formatOptions);
  const ids = useFieldIds();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<number | null>(null);
  // The icon under the pointer when the value last changed some other way (a click that cleared, a key): it doesn't
  // preview again until the pointer moves to another icon.
  const quietValue = useRef<number | null>(null);
  const isLocked = isDisabled || isReadOnly;
  const options = { maxValue, step, isClearable };

  const change = (next: number | null) => {
    if (next !== value) {
      setValue(next);
    }
  };

  /** Changes the value without the pointer: the preview gives way so the new value shows. */
  const changeQuietly = (next: number | null) => {
    if (preview !== null) {
      quietValue.current = preview;
      setPreview(null);
    }
    change(next);
  };

  const valueAt = (clientX: number) => {
    const row = rowRef.current;
    const rect = row?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return step;
    }
    // The page's layout direction, which the icons follow, rather than the locale's.
    const offset = isRightToLeft(row) ? rect.right - clientX : clientX - rect.left;
    return ratingAt(offset / rect.width, maxValue, step);
  };

  const showPreview = (next: number | null) => {
    if (next !== quietValue.current) {
      quietValue.current = null;
      setPreview(next);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const forward = isRightToLeft(event.currentTarget) ? -1 : 1;
    const keys: Record<string, () => number | null> = {
      ArrowUp: () => steppedRating(value, 1, options),
      ArrowDown: () => steppedRating(value, -1, options),
      ArrowRight: () => steppedRating(value, forward, options),
      ArrowLeft: () => steppedRating(value, -forward, options),
      PageUp: () => steppedRating(value, 1 / step, options),
      PageDown: () => steppedRating(value, -1 / step, options),
      Home: () => (isClearable ? null : step),
      End: () => maxValue,
      Delete: () => (isClearable ? null : value),
      Backspace: () => (isClearable ? null : value),
    };
    const action = keys[event.key];
    if (action) {
      // Read-only still takes the keys, so the native input doesn't move.
      event.preventDefault();
      if (!isLocked) {
        changeQuietly(action());
      }
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isLocked || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    // Stops text selection and the browser's mouse emulation, which would move focus away from the input.
    event.preventDefault();
    inputRef.current?.focus({ preventScroll: true });
    capturePointer(event.currentTarget, event.pointerId);
    dragId.current = event.pointerId;
    quietValue.current = null;
    setPreview(valueAt(event.clientX));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // A mouse or pen previews while hovering; touch only while it's down.
    if (isLocked || (dragId.current === null && event.pointerType === 'touch')) {
      return;
    }
    if (dragId.current === null || dragId.current === event.pointerId) {
      showPreview(valueAt(event.clientX));
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragId.current !== event.pointerId) {
      return;
    }
    dragId.current = null;
    const chosen = valueAt(event.clientX);
    if (isClearable && chosen === value) {
      change(null);
      quietValue.current = chosen;
      setPreview(null);
    } else {
      change(chosen);
      // A hovering mouse keeps previewing; a finger has gone.
      setPreview(event.pointerType === 'mouse' ? chosen : null);
    }
  };

  const endPreview = () => {
    if (dragId.current === null) {
      quietValue.current = null;
      setPreview(null);
    }
  };

  return (
    <div
      ref={ref}
      data-disabled={isDisabled || undefined}
      data-readonly={isReadOnly || undefined}
      data-invalid={isInvalid || undefined}
      className={fieldRootClasses(className)}
    >
      <PlainFieldFrame
        ids={ids}
        htmlFor={inputId}
        label={label}
        description={description}
        errorMessage={errorMessage}
        labelPosition={labelPosition}
        infoTip={infoTip}
        isRequired={isRequired}
        isInvalid={isInvalid}
      >
        <div
          ref={rowRef}
          data-previewing={preview === null ? undefined : true}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragId.current = null;
            endPreview();
          }}
          onPointerLeave={endPreview}
          className={cn(
            // Vertical swipes still scroll the page; sideways drags pick a rating.
            'hit-area relative flex w-max max-w-full touch-pan-y items-center self-start rounded-control select-none',
            'has-[input:focus-visible]:focus-ring',
            isDisabled ? 'cursor-not-allowed opacity-50' : !isReadOnly && 'cursor-pointer',
          )}
        >
          <RatingIcons
            value={preview ?? value ?? 0}
            maxValue={maxValue}
            icon={icon}
            size={size}
            tone={tone}
            slotClassName={slotClasses[size]}
          />
          <input
            ref={inputRef}
            id={inputId}
            type="range"
            name={name}
            min={0}
            max={maxValue}
            step="any"
            value={value ?? 0}
            aria-valuetext={valueText}
            aria-label={label === undefined ? ariaLabel : undefined}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={joinIds(
              ariaDescribedBy,
              description !== undefined && ids.descriptionId,
              isInvalid && errorMessage !== undefined && ids.errorId,
            )}
            aria-invalid={isInvalid || undefined}
            aria-readonly={isReadOnly || undefined}
            disabled={isDisabled}
            onKeyDown={onKeyDown}
            onChange={(event) => {
              // Assistive technology adjusts the native input directly: move one step the way it went.
              if (!isLocked) {
                const direction = Number(event.target.value) > (value ?? 0) ? 1 : -1;
                changeQuietly(steppedRating(value, direction, options));
              }
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            className="sr-only"
          />
        </div>
      </PlainFieldFrame>
    </div>
  );
}
