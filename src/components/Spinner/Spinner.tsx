import { ProgressBar } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { Size } from '../../utils/types';
import { SpinnerIcon } from './SpinnerIcon';

const sizeClasses: Record<Size, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

export interface SpinnerProps {
  /** Defaults to `md`. */
  size?: Size;
  /** Accessible label. Defaults to the `loading` message ("Loading"). */
  label?: string;
  className?: string;
}

/** An indeterminate loading indicator with an accessible label (a `progressbar` without a value). */
export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const messages = useCommonMessages();
  return (
    <ProgressBar
      isIndeterminate
      aria-label={label ?? messages.loading}
      className={cn('inline-flex text-fg-muted', className)}
    >
      <SpinnerIcon className={sizeClasses[size]} />
    </ProgressBar>
  );
}
