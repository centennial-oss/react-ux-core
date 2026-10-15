import { Plus } from 'lucide-react';
import { useId, useMemo, type Ref } from 'react';
import {
  Button as AriaButton,
  ColorArea,
  ColorField as AriaColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorThumb,
  DialogTrigger,
  Input,
  Label,
  SliderTrack,
  type Color,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { useThemeAttribute } from '../../utils/useThemeAttribute';
import type { FieldBaseProps } from '../Field/Field';
import { Popover } from '../Popover/Popover';

export const CHART_COLOR_TOKENS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
  'chart-9',
  'chart-10',
] as const;

/** A chart palette slot, which follows the theme. */
export type ChartColorToken = (typeof CHART_COLOR_TOKENS)[number];

/** A palette slot (`chart-3`) or a custom colour (`#2557d6`). */
export type ColorValue = ChartColorToken | `#${string}`;

function isToken(value: string): value is ChartColorToken {
  return (CHART_COLOR_TOKENS as readonly string[]).includes(value);
}

export interface ColorFieldProps extends Omit<FieldBaseProps, 'labelPosition' | 'infoTip'> {
  value?: ColorValue | null;
  defaultValue?: ColorValue | null;
  onChange?: (value: ColorValue) => void;
  /** The palette offered. Defaults to the ten chart colours. */
  swatches?: readonly ChartColorToken[];
  /** Offers a custom colour as well as the palette. Defaults to true. */
  allowsCustom?: boolean;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const swatchClasses = [
  'relative flex size-9 cursor-default items-center justify-center rounded-control outline-none',
  'data-focus-visible:focus-ring data-selected:ring-2 data-selected:ring-fg data-selected:ring-offset-2 data-selected:ring-offset-surface-1',
  'data-disabled:opacity-50',
].join(' ');

/**
 * A colour choice: swatches from the chart palette (which follow the theme), plus a custom colour. The value is the
 * palette slot (`chart-3`), so charts recolour with the theme, or a hex string for a custom colour.
 */
export function ColorField({
  label,
  description,
  errorMessage,
  value,
  defaultValue = null,
  onChange,
  swatches = CHART_COLOR_TOKENS,
  allowsCustom = true,
  isInvalid = false,
  isDisabled = false,
  isRequired = false,
  'aria-label': ariaLabel,
  className,
  ref,
}: ColorFieldProps) {
  const messages = useMessages();
  const theme = useThemeAttribute();
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const [current, setCurrent] = useControllableState<ColorValue | null>(
    value,
    defaultValue,
    (next) => {
      if (next !== null) {
        onChange?.(next);
      }
    },
  );

  // The palette's colours in the current theme (keyed on the theme so it's read again when it changes).
  const resolved = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return new Map(
      swatches.map(
        (token) => [token, style.getPropertyValue(`--color-${token}`).trim() || '#000000'] as const,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `theme` changes the tokens' values.
  }, [swatches, theme]);

  const selectedColor =
    current === null ? undefined : isToken(current) ? resolved.get(current) : current;
  const isCustom = current !== null && !isToken(current);

  const choose = (color: Color) => {
    const hex = color.toString('hex').toLowerCase();
    const token = swatches.find((slot) => resolved.get(slot)?.toLowerCase() === hex);
    setCurrent(token ?? (hex as ColorValue));
  };

  const showError = isInvalid && errorMessage !== undefined && typeof errorMessage !== 'function';
  const describedBy = [description !== undefined && descriptionId, showError && errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={label !== undefined ? labelId : undefined}
      aria-label={label === undefined ? ariaLabel : undefined}
      aria-describedby={describedBy || undefined}
      className={cn('flex min-w-0 flex-col gap-1.5 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium text-fg">
          {label}
          {isRequired && (
            <span aria-hidden="true" className="ms-0.5 text-danger-fg">
              *
            </span>
          )}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <ColorSwatchPicker
          // Each swatch's identity is its colour, which changes with the theme: start afresh when it does.
          key={theme}
          aria-labelledby={label !== undefined ? labelId : undefined}
          aria-label={label === undefined ? ariaLabel : undefined}
          value={selectedColor && !isCustom ? selectedColor : undefined}
          onChange={choose}
          className="flex flex-wrap gap-2"
        >
          {swatches.map((token) => (
            <ColorSwatchPickerItem
              key={token}
              color={resolved.get(token) ?? '#000000'}
              isDisabled={isDisabled}
              className={swatchClasses}
            >
              <ColorSwatch className="size-full rounded-control border border-border" />
            </ColorSwatchPickerItem>
          ))}
        </ColorSwatchPicker>
        {allowsCustom && (
          <ColorPicker value={isCustom ? current : (selectedColor ?? '#2557d6')} onChange={choose}>
            <DialogTrigger>
              <AriaButton
                isDisabled={isDisabled}
                aria-pressed={isCustom}
                className={cn(
                  swatchClasses,
                  'border border-dashed border-border-strong text-fg-muted data-hovered:text-fg',
                  isCustom && 'border-solid ring-2 ring-fg ring-offset-2 ring-offset-surface-1',
                )}
              >
                {isCustom ? (
                  <ColorSwatch className="size-full rounded-control" />
                ) : (
                  <Plus aria-hidden="true" className="size-4" />
                )}
                <span className="sr-only">{messages.customColor}</span>
              </AriaButton>
              <Popover aria-label={messages.customColor}>
                <div className="flex w-56 flex-col gap-3">
                  <ColorArea
                    colorSpace="hsb"
                    xChannel="saturation"
                    yChannel="brightness"
                    className="h-40 w-full rounded-control"
                  >
                    <ColorThumb className="size-5 rounded-full border-2 border-surface-1 shadow-overlay data-focus-visible:size-6" />
                  </ColorArea>
                  <ColorSlider colorSpace="hsb" channel="hue" className="flex flex-col gap-1">
                    <Label className="text-xs text-fg-muted" />
                    <SliderTrack className="h-6 w-full rounded-control">
                      <ColorThumb className="top-1/2 size-5 rounded-full border-2 border-surface-1 shadow-overlay data-focus-visible:size-6" />
                    </SliderTrack>
                  </ColorSlider>
                  <AriaColorField className="flex flex-col gap-1">
                    <Label className="text-xs text-fg-muted">{messages.hexColor}</Label>
                    <Input className="h-10 rounded-control border border-border bg-surface-1 px-2 text-base text-fg outline-none data-focused:border-accent-solid sm:text-sm" />
                  </AriaColorField>
                </div>
              </Popover>
            </DialogTrigger>
          </ColorPicker>
        )}
      </div>
      {description !== undefined && (
        <span id={descriptionId} className="text-xs text-fg-muted">
          {description}
        </span>
      )}
      {showError && (
        <span id={errorId} className="text-xs font-medium text-danger-fg">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
