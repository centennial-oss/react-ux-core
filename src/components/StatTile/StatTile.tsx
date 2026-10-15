import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
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
const deltaClasses: Record<Tone, string> = {
  neutral: 'text-neutral-fg',
  accent: 'text-accent-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
};

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
  className?: string;
}

/** A key figure with its label, unit, change and trend. Long values shrink to fit the tile's width. */
export function StatTile({
  label,
  value,
  unit,
  delta,
  sparkline,
  footer,
  isLoading = false,
  className,
}: StatTileProps) {
  const messages = useMessages();
  const labelId = useId();
  const DeltaIcon = delta ? deltaIcons[delta.direction] : null;
  const deltaText = delta
    ? { up: messages.deltaUp, down: messages.deltaDown, flat: messages.deltaFlat }[delta.direction](
        {
          value: delta.value,
        },
      )
    : '';

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-busy={isLoading || undefined}
      className={cn(
        '@container relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-card border border-border bg-surface-2 p-4 text-fg shadow-raised',
        className,
      )}
    >
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
            deltaClasses[delta.tone ?? deltaTones[delta.direction]],
          )}
        >
          <DeltaIcon aria-hidden="true" className="size-4" />
          <span className="sr-only">{deltaText}</span>
          <span aria-hidden="true">{delta.value}</span>
        </p>
      )}
      {footer !== undefined && <div className="relative mt-1 text-xs text-fg-muted">{footer}</div>}
    </div>
  );
}
