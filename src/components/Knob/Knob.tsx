// Knob: a rotary control for dense control surfaces (audio and synth parameters, encoder settings, lighting). It's a
// native range input (role `slider`, visually hidden, so screen readers and switch access work as usual) under an
// SVG dial drawn from tokens. React Aria's slider hooks assume a track to point at, and their PageUp/PageDown step a
// tenth of the range, so the knob handles dragging, the wheel and keys itself:
//
// - Drag up or down on the dial to turn it (hold Shift for fine control); the wheel steps while the knob has focus.
// - Arrow keys step, PageUp/PageDown take 10 steps, Home/End jump to the ends, Enter resets.
// - Double-click the dial (or press Enter) to reset to `resetValue`; type a value in the inline field below it.
//
// On a `log` scale (frequencies) positions along the arc are logarithmic, and keys move 1% (10% with PageUp/Down)
// of the arc.

import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Input, NumberField as AriaNumberField, useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import {
  arcPath,
  centreValue,
  effectiveScale,
  pointAt,
  positionToAngle,
  positionToValue,
  snapToStep,
  valueToPosition,
  type KnobRange,
  type KnobScale,
} from './knobMath';
import { defaultKnobMessages } from './messages';

export interface KnobProps {
  /** The visible label, above the dial. Without one, pass `aria-label`. */
  label?: ReactNode;
  /** Help text under the knob. */
  description?: ReactNode;
  /** Shown under the knob while `isInvalid` is set. */
  errorMessage?: ReactNode;
  /** The value, controlled. */
  value?: number;
  /** The initial value, uncontrolled. Defaults to the centre for `isBipolar`, otherwise `minValue`. */
  defaultValue?: number;
  /** Called continuously while the knob turns. */
  onChange?: (value: number) => void;
  /** Called once when a drag, key press, wheel step or typed value ends, for work that shouldn't run on every step. */
  onChangeEnd?: (value: number) => void;
  /** Defaults to 0. */
  minValue?: number;
  /** Defaults to 100. */
  maxValue?: number;
  /** Values snap to multiples of `step` from `minValue`. Defaults to 1; 0 doesn't snap. */
  step?: number;
  /** A centre detent for bipolar values (pan, EQ gain): the arc fills from the centre, and a drag sticks there. */
  isBipolar?: boolean;
  /** `Intl.NumberFormat` options for the value shown and announced. */
  formatOptions?: Intl.NumberFormatOptions;
  /** The value's unit ("dB", "Hz"), shown after it and included in the announced value. */
  unit?: string;
  /** `log` for frequency-like parameters (needs a positive `minValue`). Defaults to `linear`. */
  scale?: KnobScale;
  /** Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** The value a double-click or Enter resets to. Defaults to `defaultValue`, or the centre for `isBipolar`. */
  resetValue?: number;
  /** Marks around the arc at these values. */
  ticks?: readonly number[];
  /** Shows an inline field under the dial for typing a value. Defaults to true; false shows the value as text. */
  isValueEditable?: boolean;
  /** Hides the value under the dial (it's still announced). */
  isValueHidden?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Marks the knob invalid; shows `errorMessage`. */
  isInvalid?: boolean;
  /** Submits the value with a form. */
  name?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  /** The knob's root element. */
  ref?: Ref<HTMLDivElement>;
}

const dialSizes = { sm: 'size-10', md: 'size-14', lg: 'size-20' } as const;
const valueTextSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-sm' } as const;

/** How far a drag goes for the full range, in pixels: normal and fine (Shift). */
const DRAG_PIXELS = 200;
const FINE_DRAG_PIXELS = 1000;
/** Half the width of the centre detent, as a fraction of the arc. */
const DETENT = 0.04;
/** Wheel distance per step, in pixels; one mouse-wheel notch is usually 100. */
const WHEEL_PIXELS = 50;
/** Positions of the native input on a log scale. */
const LOG_POSITIONS = 100;

const TRACK_RADIUS = 40;
const BODY_RADIUS = 30;

/**
 * A rotary knob: a `slider` whose value shows as an arc. Drag up or down to turn it (Shift for fine), use the wheel
 * while it's focused, or the arrow keys (PageUp/PageDown take 10 steps); double-click or press Enter to reset, or type
 * a value in the field under it. `isBipolar` fills from the centre with a detent there, `scale="log"` suits
 * frequencies, and `unit` is shown and announced with the value.
 */
export function Knob({
  label,
  description,
  errorMessage,
  value: valueProp,
  defaultValue,
  onChange,
  onChangeEnd,
  minValue = 0,
  maxValue = 100,
  step = 1,
  isBipolar = false,
  formatOptions,
  unit,
  scale = 'linear',
  size = 'md',
  resetValue,
  ticks,
  isValueEditable = true,
  isValueHidden = false,
  isDisabled = false,
  isReadOnly = false,
  isInvalid = false,
  name,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  className,
  ref,
}: KnobProps) {
  const messages = useEntryMessages(defaultKnobMessages);
  const { locale } = useLocale();
  const range: KnobRange = useMemo(
    () => ({ minValue, maxValue, scale }),
    [minValue, maxValue, scale],
  );
  const isLog = effectiveScale(range) === 'log';
  const centre = snapToStep(centreValue(range), minValue, maxValue, step);
  const [value, setValue] = useControllableState(
    valueProp,
    defaultValue ?? (isBipolar ? centre : minValue),
    onChange,
  );
  const position = valueToPosition(value, range);
  const reset = resetValue ?? defaultValue ?? (isBipolar ? centre : minValue);
  const isLocked = isDisabled || isReadOnly;

  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; position: number; lastY: number; start: number } | null>(
    null,
  );
  const wheel = useRef(0);

  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, formatOptions),
    [locale, formatOptions],
  );
  const formatted = formatter.format(value);
  const valueText =
    unit === undefined ? formatted : messages.knobValueWithUnit({ value: formatted, unit });
  const textLabel = typeof label === 'string' ? label : ariaLabel;
  const isErrorShown = isInvalid && errorMessage !== undefined;
  const describedBy = [
    ariaDescribedBy,
    description !== undefined ? descriptionId : undefined,
    isErrorShown ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  const snap = (next: number) => snapToStep(next, minValue, maxValue, step);
  const change = (next: number, isEnd: boolean) => {
    if (next !== value) {
      setValue(next);
    }
    if (isEnd) {
      onChangeEnd?.(next);
    }
  };

  /** The value `steps` steps away: whole steps on a linear scale, 1% of the arc each on a log scale. */
  const stepped = (from: number, steps: number) => {
    if (!isLog) {
      return snap(from + steps * (step > 0 ? step : (maxValue - minValue) / 100));
    }
    const next = snap(positionToValue(valueToPosition(from, range) + steps / 100, range));
    // A coarse step can swallow a 1% move; move at least one step.
    return next === from && step > 0 ? snap(from + Math.sign(steps) * step) : next;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (isLocked) {
      return;
    }
    const keys: Record<string, () => number> = {
      ArrowUp: () => stepped(value, 1),
      ArrowRight: () => stepped(value, 1),
      ArrowDown: () => stepped(value, -1),
      ArrowLeft: () => stepped(value, -1),
      PageUp: () => stepped(value, 10),
      PageDown: () => stepped(value, -10),
      Home: () => minValue,
      End: () => maxValue,
      Enter: () => snap(reset),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      change(action(), true);
    }
  };

  const onWheel = useEffectEvent((event: WheelEvent) => {
    // Only a focused knob takes the wheel, so scrolling a page past a knob never turns it.
    if (isLocked || document.activeElement !== inputRef.current) {
      return;
    }
    event.preventDefault();
    const unitSize = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    wheel.current += event.deltaY * unitSize;
    if (Math.abs(wheel.current) >= WHEEL_PIXELS) {
      // Scrolling up (negative delta) turns the knob up.
      change(stepped(value, wheel.current < 0 ? 1 : -1), true);
      wheel.current = 0;
    }
  });

  useEffect(() => {
    const dial = dialRef.current;
    if (!dial) {
      return;
    }
    const listener = (event: WheelEvent) => {
      onWheel(event);
    };
    dial.addEventListener('wheel', listener, { passive: false });
    return () => {
      dial.removeEventListener('wheel', listener);
    };
  }, []);

  /** The value at a raw drag position, with the centre detent. */
  const valueAtDrag = (raw: number) =>
    isBipolar && Math.abs(raw - 0.5) < DETENT ? centre : snap(positionToValue(raw, range));

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isLocked || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    // Stops the browser's mouse emulation, which would otherwise move focus away from the input focused here.
    event.preventDefault();
    inputRef.current?.focus({ preventScroll: true });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers can't be captured; the drag still follows events on the dial.
    }
    drag.current = { pointerId: event.pointerId, position, lastY: event.clientY, start: value };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    const pixels = event.shiftKey ? FINE_DRAG_PIXELS : DRAG_PIXELS;
    // Dragging up (a smaller clientY) turns the knob up.
    current.position = Math.min(
      1,
      Math.max(0, current.position + (current.lastY - event.clientY) / pixels),
    );
    current.lastY = event.clientY;
    change(valueAtDrag(current.position), false);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    const final = valueAtDrag(current.position);
    if (final !== current.start) {
      onChangeEnd?.(final);
    }
  };

  const angle = positionToAngle(position);
  const fillFrom = isBipolar ? 0.5 : 0;
  const pointerInner = pointAt(angle, 10);
  const pointerOuter = pointAt(angle, BODY_RADIUS - 4);
  const marks = [...new Set([...(ticks ?? []), ...(isBipolar ? [centre] : [])])];

  return (
    <div
      ref={ref}
      data-disabled={isDisabled || undefined}
      data-invalid={isInvalid || undefined}
      className={cn(
        'inline-flex w-max min-w-0 flex-col items-center gap-1 text-sm text-fg',
        className,
      )}
    >
      {label !== undefined && (
        <label id={labelId} htmlFor={inputId} className="max-w-32 text-center font-medium text-fg">
          {label}
        </label>
      )}
      <div
        ref={dialRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => {
          if (!isLocked) {
            change(snap(reset), true);
          }
        }}
        className={cn(
          // Horizontal pans scroll a mixer sideways; vertical drags turn the knob.
          'hit-area relative shrink-0 touch-pan-x rounded-full select-none',
          'has-[input:focus-visible]:focus-ring',
          isLocked ? 'cursor-not-allowed' : 'cursor-ns-resize',
          isDisabled && 'opacity-50',
          dialSizes[size],
        )}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full overflow-visible">
          <path
            d={arcPath(0, 1, TRACK_RADIUS)}
            fill="none"
            strokeWidth={8}
            strokeLinecap="round"
            className="stroke-surface-4"
          />
          {position !== fillFrom && (
            <path
              d={arcPath(fillFrom, position, TRACK_RADIUS)}
              fill="none"
              strokeWidth={8}
              strokeLinecap="round"
              className={isInvalid ? 'stroke-danger-solid' : 'stroke-accent-solid'}
            />
          )}
          {marks.map((mark) => {
            const markAngle = positionToAngle(valueToPosition(mark, range));
            const inner = pointAt(markAngle, 47);
            const outer = pointAt(markAngle, 53);
            return (
              <line
                key={mark}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                strokeWidth={3}
                strokeLinecap="round"
                className="stroke-fg-muted"
              />
            );
          })}
          <circle
            cx={50}
            cy={50}
            r={BODY_RADIUS}
            strokeWidth={2}
            className="fill-surface-2 stroke-border-strong"
          />
          <line
            x1={pointerInner.x}
            y1={pointerInner.y}
            x2={pointerOuter.x}
            y2={pointerOuter.y}
            strokeWidth={6}
            strokeLinecap="round"
            className="stroke-fg"
          />
        </svg>
        <input
          ref={inputRef}
          id={inputId}
          type="range"
          name={name}
          // On a log scale the input moves through positions along the arc; aria-valuetext gives the real value.
          min={isLog ? 0 : minValue}
          max={isLog ? LOG_POSITIONS : maxValue}
          step={isLog ? 1 : step > 0 ? step : 'any'}
          value={isLog ? Math.round(position * LOG_POSITIONS) : value}
          aria-valuetext={valueText}
          aria-label={label === undefined ? ariaLabel : undefined}
          aria-labelledby={
            [label !== undefined ? labelId : undefined, ariaLabelledBy].filter(Boolean).join(' ') ||
            undefined
          }
          aria-describedby={describedBy || undefined}
          aria-invalid={isInvalid || undefined}
          aria-readonly={isReadOnly || undefined}
          disabled={isDisabled}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            // Assistive technology adjusts the native input directly.
            if (isLocked) {
              return;
            }
            const raw = Number(event.target.value);
            change(snap(isLog ? positionToValue(raw / LOG_POSITIONS, range) : raw), true);
          }}
          className="sr-only"
        />
      </div>
      {!isValueHidden &&
        (isValueEditable ? (
          <AriaNumberField
            aria-label={
              textLabel === undefined
                ? messages.value
                : messages.knobValueInput({ label: textLabel })
            }
            value={value}
            minValue={minValue}
            maxValue={maxValue}
            step={isLog || step <= 0 ? undefined : step}
            formatOptions={formatOptions}
            isDisabled={isDisabled}
            isReadOnly={isReadOnly}
            onChange={(next) => {
              if (!Number.isNaN(next)) {
                change(snap(next), true);
              }
            }}
            className="flex items-center justify-center gap-0.5"
          >
            <Input
              className={cn(
                'min-h-hit min-w-0 rounded-control bg-transparent px-1 text-base text-fg tabular-nums outline-none sm:text-sm',
                // With a unit, the number sits right against it.
                unit === undefined ? 'w-16 text-center' : 'w-14 text-end',
                'hover:bg-surface-3 focus-visible:bg-surface-1 focus-visible:focus-ring disabled:cursor-not-allowed',
              )}
            />
            {unit !== undefined && (
              <span aria-hidden="true" className="text-xs text-fg-muted">
                {unit}
              </span>
            )}
          </AriaNumberField>
        ) : (
          <span
            aria-hidden="true"
            className={cn('text-fg-muted tabular-nums', valueTextSizes[size])}
          >
            {valueText}
          </span>
        ))}
      {description !== undefined && (
        <span id={descriptionId} className="max-w-40 text-center text-xs text-fg-muted">
          {description}
        </span>
      )}
      {isErrorShown && (
        <span id={errorId} className="max-w-40 text-center text-xs font-medium text-danger-fg">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
