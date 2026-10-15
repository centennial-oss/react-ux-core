import {
  Separator as AriaSeparator,
  type SeparatorProps as AriaSeparatorProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';

export interface SeparatorProps extends Omit<AriaSeparatorProps, 'className' | 'style'> {
  className?: string;
}

/** A horizontal or vertical divider with `separator` semantics. */
export function Separator({ orientation = 'horizontal', className, ...rest }: SeparatorProps) {
  return (
    <AriaSeparator
      {...rest}
      orientation={orientation}
      className={cn(
        'shrink-0 border-0 bg-border',
        orientation === 'vertical' ? 'w-px self-stretch' : 'h-px w-full',
        className,
      )}
    />
  );
}
