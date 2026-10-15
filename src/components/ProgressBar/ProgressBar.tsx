import type { ReactNode } from 'react';
import {
  Label,
  ProgressBar as AriaProgressBar,
  type ProgressBarProps as AriaProgressBarProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';

type ProgressTone = 'accent' | 'success' | 'warning' | 'danger';

const fillClasses: Record<ProgressTone, string> = {
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
};

export interface ProgressBarProps extends Omit<
  AriaProgressBarProps,
  'className' | 'style' | 'children'
> {
  /** Visible label. Without one, pass `aria-label`. */
  label?: ReactNode;
  /** Hides the value text (for example "45%") shown next to the label. */
  isValueHidden?: boolean;
  /** Defaults to `accent`. */
  tone?: ProgressTone;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
}

/** Progress of a task: determinate (`value` between `minValue` and `maxValue`) or indeterminate. */
export function ProgressBar({
  label,
  isValueHidden = false,
  tone = 'accent',
  size = 'md',
  className,
  ...rest
}: ProgressBarProps) {
  return (
    <AriaProgressBar
      {...rest}
      className={cn('flex w-full flex-col gap-1.5 text-sm text-fg', className)}
    >
      {({ percentage, valueText, isIndeterminate }) => (
        <>
          {(label !== undefined || (!isValueHidden && !isIndeterminate)) && (
            <div className="flex items-baseline justify-between gap-3">
              {label !== undefined ? <Label className="font-medium">{label}</Label> : <span />}
              {!isValueHidden && !isIndeterminate && (
                <span className="text-fg-muted tabular-nums">{valueText}</span>
              )}
            </div>
          )}
          <div
            className={cn(
              'w-full overflow-hidden rounded-full bg-surface-4',
              size === 'sm' ? 'h-1' : 'h-2',
            )}
          >
            {isIndeterminate ? (
              <div
                className={cn(
                  'h-full w-2/5 rounded-full animate-indeterminate motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60',
                  fillClasses[tone],
                )}
              />
            ) : (
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-(--duration-normal)',
                  fillClasses[tone],
                )}
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the fill width is the progress
                style={{ width: `${String(percentage ?? 0)}%` }}
              />
            )}
          </div>
        </>
      )}
    </AriaProgressBar>
  );
}
