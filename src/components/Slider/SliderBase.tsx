// The shared frame and track behind Slider and RangeSlider: label and value on one row, the track with its fill,
// tick marks and thumbs, tick labels, then the description and error. React Aria's Slider has no description or
// validation of its own, so both are wired here: their ids join the thumbs' aria-describedby, and `isInvalid` sets
// aria-invalid on each thumb.

import { useId, type ReactNode, type Ref } from 'react';
import {
  Slider as AriaSlider,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  Text,
  type SliderProps as AriaSliderProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import { FieldLabel, FieldLayout, fieldRootClasses, type FieldBaseProps } from '../Field/Field';

/** A labelled point on the scale. */
export interface SliderTick {
  value: number;
  /** Shown under the track. Without one, only the mark is drawn. */
  label?: ReactNode;
}

/** Props Slider and RangeSlider share. */
export interface SliderSharedProps extends Omit<FieldBaseProps, 'errorMessage'> {
  /** Shown under the track while `isInvalid` is set. */
  errorMessage?: ReactNode;
  /** Marks the slider invalid, for example when a range is too narrow; shows `errorMessage`. */
  isInvalid?: boolean;
  /** Marks on the track at these values, with optional labels under it. */
  ticks?: readonly SliderTick[];
  /** Hides the formatted value shown beside the label. */
  isValueHidden?: boolean;
  className?: string;
  /** The slider's root element. */
  ref?: Ref<HTMLDivElement>;
}

type SliderBaseProps<T extends number | number[]> = Omit<
  AriaSliderProps<T>,
  'className' | 'style' | 'children' | 'render' | 'orientation'
> &
  SliderSharedProps & {
    /** Accessible names for the thumbs, by index, read with the slider's label. */
    thumbLabels?: readonly (string | undefined)[];
  };

/** Whether `value` lies under the fill: between the thumbs of a range, or from the start to a single thumb. */
function isInFill(values: number[], start: number, value: number): boolean {
  const first = values[0] ?? start;
  const last = values[values.length - 1] ?? start;
  return values.length > 1 ? value >= first && value <= last : value >= start && value <= first;
}

const tickLabelAlign = (percent: number) =>
  percent <= 0
    ? ''
    : percent >= 100
      ? '-translate-x-full rtl:translate-x-full'
      : '-translate-x-1/2 rtl:translate-x-1/2';

export function SliderBase<T extends number | number[]>({
  label,
  description,
  errorMessage,
  isInvalid = false,
  labelPosition = 'top',
  ticks,
  isValueHidden = false,
  thumbLabels,
  className,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: SliderBaseProps<T>) {
  const descriptionId = useId();
  const errorId = useId();
  const isErrorShown = isInvalid && errorMessage !== undefined;
  const describedBy = [
    ariaDescribedBy,
    description !== undefined ? descriptionId : undefined,
    isErrorShown ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const hasTickLabels = ticks?.some((tick) => tick.label !== undefined) ?? false;

  return (
    <AriaSlider
      {...rest}
      aria-describedby={describedBy || undefined}
      data-invalid={isInvalid || undefined}
      className={fieldRootClasses(className)}
    >
      {({ state }) => (
        <FieldLayout
          labelPosition={labelPosition}
          label={
            label !== undefined || !isValueHidden ? (
              <div
                className={cn(
                  'flex min-w-0 items-baseline justify-between gap-3',
                  labelPosition === 'side' && '@md:flex-col @md:justify-start @md:gap-0.5',
                )}
              >
                {label !== undefined ? <FieldLabel>{label}</FieldLabel> : <span />}
                {!isValueHidden && <SliderOutput className="text-fg-muted tabular-nums" />}
              </div>
            ) : null
          }
        >
          {/*
           * The track is inset so a thumb at either end, its focus ring and its touch target stay inside the field
           * (a touch target past the edge would scroll a phone page sideways). Only the track fades when disabled,
           * so the label and value keep their contrast.
           */}
          <SliderTrack className="relative mx-[max(0.875rem,calc(var(--hit-size)/2))] flex h-hit cursor-pointer items-center data-disabled:cursor-not-allowed data-disabled:opacity-50">
            <div className="relative h-1.5 w-full rounded-full bg-surface-4">
              <SliderFill
                className={cn('rounded-full', isInvalid ? 'bg-danger-solid' : 'bg-accent-solid')}
              />
              {ticks?.map((tick) => (
                <span
                  key={tick.value}
                  aria-hidden="true"
                  className={cn(
                    'absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full rtl:translate-x-1/2',
                    // Marks under the fill take the fill's foreground colour so they stay visible.
                    isInFill(state.values, state.getThumbMinValue(0), tick.value)
                      ? 'bg-accent-on-solid'
                      : 'bg-fg-muted',
                  )}
                  // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the tick's position on the scale
                  style={{
                    insetInlineStart: `${String(state.getValuePercent(tick.value) * 100)}%`,
                  }}
                />
              ))}
            </div>
            {state.values.map((_, index) => (
              <SliderThumb
                // Thumbs are identified by position; there's always the same number of them.
                key={index}
                index={index}
                aria-label={thumbLabels?.[index]}
                // Deprecated in React Aria without a replacement, but it's the only way to set aria-invalid on the
                // thumb's input.
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                isInvalid={isInvalid}
                className={cn(
                  'hit-area top-1/2 size-5 rounded-full border-2 bg-surface-2 shadow-raised',
                  'transition-[background-color] duration-(--duration-fast) ease-standard',
                  'data-focus-visible:focus-ring data-hovered:bg-surface-3 data-dragging:bg-surface-4',
                  'data-disabled:cursor-not-allowed',
                  isInvalid ? 'border-danger-solid' : 'border-accent-solid',
                )}
              />
            ))}
          </SliderTrack>
          {hasTickLabels && (
            <div className="relative mx-[max(0.875rem,calc(var(--hit-size)/2))] h-4 text-xs text-fg-muted">
              {ticks?.map((tick) => {
                if (tick.label === undefined) {
                  return null;
                }
                const percent = state.getValuePercent(tick.value) * 100;
                return (
                  <span
                    key={tick.value}
                    className={cn('absolute top-0 whitespace-nowrap', tickLabelAlign(percent))}
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the label sits under its tick
                    style={{ insetInlineStart: `${String(percent)}%` }}
                  >
                    {tick.label}
                  </span>
                );
              })}
            </div>
          )}
          {description !== undefined && (
            <Text id={descriptionId} className="text-xs text-fg-muted">
              {description}
            </Text>
          )}
          {isErrorShown && (
            <Text id={errorId} className="text-xs font-medium text-danger-fg">
              {errorMessage}
            </Text>
          )}
        </FieldLayout>
      )}
    </AriaSlider>
  );
}
