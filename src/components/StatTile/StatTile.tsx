import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { trendStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { toneTextClasses } from '../../utils/toneClasses';
import type { Tone } from '../../utils/types';
import { Skeleton } from '../Skeleton/Skeleton';
import { Sparkline } from '../Sparkline/Sparkline';

export interface StatDelta {
  /** The change, formatted for display, for example "12%" or "+340". */
  value: string;
  direction: 'up' | 'down' | 'flat';
  /** Colour of the change. Defaults to success for up, danger for down, neutral for flat; set it when up is bad. */
  tone?: Tone;
}

const deltaTones: Record<StatDelta['direction'], Tone> = {
  up: 'success',
  down: 'danger',
  flat: 'neutral',
};
const deltaIcons = { up: TrendingUp, down: TrendingDown, flat: Minus };

export interface StatTileProps {
  label: ReactNode;
  /** The value, formatted for display. */
  value: ReactNode;
  unit?: ReactNode;
  delta?: StatDelta;
  /** A series drawn faintly behind the value. */
  sparkline?: readonly number[];
  footer?: ReactNode;
  /** Shows a placeholder for the value while loading. */
  isLoading?: boolean;
  /**
   * Makes the whole tile a button, named by what it shows, such as a tile that steps through variants of a figure.
   * Put a position ("2 of 5") in the `footer`.
   */
  onPress?: () => void;
  /** With `onPress`: what pressing does, read after the tile's content ("Show the next value"). */
  pressHint?: string;
  /** With `onPress`: called as the pointer enters and leaves the tile, such as to pause rotation. */
  onHoverChange?: (isHovered: boolean) => void;
  /** With `onPress`: called as focus enters and leaves the tile. */
  onFocusChange?: (isFocused: boolean) => void;
  className?: string;
}

const tileClasses =
  '@container relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-card border border-border bg-surface-2 p-4 text-fg shadow-raised';

/** A key figure with its label, unit, change and trend. Long values shrink to fit the tile's width. */
export function StatTile({
  label,
  value,
  unit,
  delta,
  sparkline,
  footer,
  isLoading = false,
  onPress,
  pressHint,
  onHoverChange,
  onFocusChange,
  className,
}: StatTileProps) {
  const messages = useEntryMessages(trendStrings);
  const labelId = useId();
  const DeltaIcon = delta ? deltaIcons[delta.direction] : null;
  const deltaText = delta
    ? { up: messages.deltaUp, down: messages.deltaDown, flat: messages.deltaFlat }[delta.direction](
        {
          value: delta.value,
        },
      )
    : '';

  const content = (
    <>
      {sparkline && sparkline.length > 0 && (
        <Sparkline
          data={sparkline}
          aria-hidden
          height={48}
          className="pointer-events-none absolute inset-x-0 bottom-0 opacity-25"
        />
      )}
      <p id={labelId} className="relative text-sm text-fg-muted">
        {label}
      </p>
      <div className="relative flex min-w-0 items-baseline gap-1.5">
        {isLoading ? (
          <Skeleton shape="rect" height="2.25rem" width="60%" />
        ) : (
          <>
            <span className="min-w-0 text-[clamp(1.25rem,14cqi,2.25rem)] leading-tight font-semibold tabular-nums wrap-anywhere">
              {value}
            </span>
            {unit !== undefined && <span className="shrink-0 text-sm text-fg-muted">{unit}</span>}
          </>
        )}
      </div>
      {delta && DeltaIcon && !isLoading && (
        <p
          className={cn(
            'relative flex items-center gap-1 text-sm font-medium',
            toneTextClasses[delta.tone ?? deltaTones[delta.direction]],
          )}
        >
          <DeltaIcon aria-hidden="true" className="size-4" />
          <span className="sr-only">{deltaText}</span>
          <span aria-hidden="true">{delta.value}</span>
        </p>
      )}
      {footer !== undefined && <div className="relative mt-1 text-xs text-fg-muted">{footer}</div>}
    </>
  );

  if (onPress) {
    // The tile is the button; its name is its content (so it holds the visible text), then what pressing does.
    return (
      <AriaButton
        onPress={onPress}
        onHoverChange={onHoverChange}
        onFocusChange={onFocusChange}
        aria-busy={isLoading || undefined}
        className={cn(
          tileClasses,
          'w-full cursor-pointer text-start outline-none data-focus-visible:focus-ring data-hovered:border-border-strong',
          className,
        )}
      >
        {content}
        {pressHint !== undefined && <span className="sr-only">{pressHint}</span>}
      </AriaButton>
    );
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-busy={isLoading || undefined}
      className={cn(tileClasses, className)}
    >
      {content}
    </div>
  );
}
