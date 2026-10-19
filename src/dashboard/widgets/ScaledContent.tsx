// A widget's content zoomed with the dashboard on large displays (RESP-08), filling the frame's body.

import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { scaleStyle } from './scale';

/** The content at the dashboard's scale: type, strokes and spacing grow together. */
export function ScaledContent({
  scale,
  className,
  children,
}: {
  scale: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      // eslint-disable-next-line no-restricted-syntax -- dynamic: the content scale.
      style={scaleStyle(scale)}
      className={cn('flex min-h-0 flex-1 flex-col', className)}
    >
      {children}
    </div>
  );
}
