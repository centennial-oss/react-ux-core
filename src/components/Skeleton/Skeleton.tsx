import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps {
  /** Placeholder shape when there are no children. Defaults to `text`. */
  shape?: 'text' | 'rect' | 'circle';
  /** Number of text lines (`text` shape). Defaults to 1. */
  lineCount?: number;
  /** Width, as a CSS length or pixels. Defaults to the full width (`circle`: 2.5rem). */
  width?: number | string;
  /** Height, as a CSS length or pixels (`rect` and `circle`). */
  height?: number | string;
  /**
   * With children: while true, the children are shown as placeholder blocks shaped like their own text and
   * controls; when false, the real children appear. Defaults to true.
   */
  isLoading?: boolean;
  children?: ReactNode;
  className?: string;
}

const pulse = 'motion-safe:animate-pulse';

function toLength(value: number | string | undefined): string | undefined {
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * A loading placeholder. Hidden from assistive technology: mark the loading region with `aria-busy` (and announce
 * results when they arrive) instead.
 */
export function Skeleton({
  shape = 'text',
  lineCount = 1,
  width,
  height,
  isLoading = true,
  children,
  className,
}: SkeletonProps) {
  if (children !== undefined) {
    if (!isLoading) {
      return <>{children}</>;
    }
    return (
      <div
        aria-hidden="true"
        inert
        className={cn(
          'pointer-events-none select-none text-transparent',
          '[&_*]:border-transparent! [&_*]:text-transparent! [&_*]:shadow-none! [&_img]:opacity-0 [&_svg]:opacity-0',
          '[&_:is(p,span,h1,h2,h3,h4,h5,h6,a,button,label,li,dt,dd,th,td,img,svg,input)]:rounded',
          '[&_:is(p,span,h1,h2,h3,h4,h5,h6,a,button,label,li,dt,dd,th,td,img,svg,input)]:bg-surface-3!',
          pulse,
          className,
        )}
      >
        {children}
      </div>
    );
  }

  // Dynamic geometry: the size comes from props.
  const size: CSSProperties = { width: toLength(width), height: toLength(height) };

  if (shape === 'circle') {
    const diameter = toLength(width ?? height) ?? '2.5rem';
    return (
      <span
        aria-hidden="true"
        className={cn('block shrink-0 rounded-full bg-surface-3', pulse, className)}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry from props
        style={{ width: diameter, height: diameter }}
      />
    );
  }

  if (shape === 'rect') {
    return (
      <span
        aria-hidden="true"
        className={cn('block h-24 w-full rounded-control bg-surface-3', pulse, className)}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry from props
        style={size}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn('flex w-full flex-col gap-2', className)}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry from props
      style={{ width: size.width }}
    >
      {Array.from({ length: lineCount }, (_, line) => (
        <span
          key={line}
          className={cn(
            'block h-[0.75em] rounded bg-surface-3',
            pulse,
            line === lineCount - 1 && lineCount > 1 && 'w-3/4',
          )}
        />
      ))}
    </span>
  );
}
