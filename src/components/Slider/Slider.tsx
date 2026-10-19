import type { SliderProps as AriaSliderProps } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { SliderBase, type SliderSharedProps } from './SliderBase';

type AriaSliderBaseProps = Omit<
  AriaSliderProps<number>,
  | 'className'
  | 'style'
  | 'children'
  | 'render'
  | 'orientation'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onChangeEnd'
>;

export interface SliderProps extends AriaSliderBaseProps, SliderSharedProps {
  /** The value, controlled. */
  value?: number;
  /** The initial value, uncontrolled. Defaults to `minValue`. */
  defaultValue?: number;
  /** Called continuously while the thumb moves. */
  onChange?: (value: number) => void;
  /** Called once when a drag or key press ends, for work that shouldn't run on every step. */
  onChangeEnd?: (value: number) => void;
}

/**
 * A value on a scale from `minValue` to `maxValue` (0–100 by default). Set `step` for discrete values, `ticks` for
 * labelled marks and `formatOptions` (`Intl.NumberFormat`) for the value shown and announced. Arrow keys step,
 * PageUp/PageDown take bigger steps, Home/End jump to the ends; the track can be clicked, tapped or dragged.
 * `orientation="vertical"` makes a fader.
 */
export function Slider(props: SliderProps) {
  return <SliderBase<number> {...props} />;
}

export interface RangeSliderProps extends AriaSliderBaseProps, SliderSharedProps {
  /** The start and end, controlled. */
  value?: [number, number];
  /** The initial start and end, uncontrolled. Defaults to `[minValue, maxValue]`. */
  defaultValue?: [number, number];
  /** Called continuously while a thumb moves. */
  onChange?: (value: [number, number]) => void;
  /** Called once when a drag or key press ends. */
  onChangeEnd?: (value: [number, number]) => void;
  /** Accessible name of the start thumb, read with the slider's label ("From Price"). Defaults to the `from` message. */
  startLabel?: string;
  /** Accessible name of the end thumb, read with the slider's label. Defaults to the `to` message. */
  endLabel?: string;
}

// React Aria reports a range as number[]; a two-thumb slider always has exactly two values.
const asRange = (value: number[]) => value as [number, number];

/**
 * A range on a scale, with a thumb for each end; the thumbs can't cross. Takes the same props as `Slider`, with
 * `[start, end]` values.
 */
export function RangeSlider({
  value,
  defaultValue,
  onChange,
  onChangeEnd,
  startLabel,
  endLabel,
  minValue = 0,
  maxValue = 100,
  ...rest
}: RangeSliderProps) {
  const messages = useCommonMessages();
  return (
    <SliderBase<number[]>
      {...rest}
      minValue={minValue}
      maxValue={maxValue}
      value={value}
      defaultValue={defaultValue ?? [minValue, maxValue]}
      onChange={
        onChange &&
        ((next: number[]) => {
          onChange(asRange(next));
        })
      }
      onChangeEnd={
        onChangeEnd &&
        ((next: number[]) => {
          onChangeEnd(asRange(next));
        })
      }
      thumbLabels={[startLabel ?? messages.from, endLabel ?? messages.to]}
    />
  );
}
