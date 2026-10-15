// Layout primitives: Stack (a column), Inline (a wrapping row), Grid (columns by the container's own width) and
// Spacer, so screens lay out content without bare divs.
import type { ElementType, HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

/** Spacing between children, on Tailwind's 0.25rem scale. */
export type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const gapClasses: Record<Gap, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12',
};

type Align = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
type Justify = 'start' | 'center' | 'end' | 'between';

const alignClasses: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

const justifyClasses: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

/** Elements a layout primitive may render as (a landmark or list when that's what the content is). */
type LayoutElement =
  'div' | 'main' | 'section' | 'ul' | 'ol' | 'li' | 'nav' | 'aside' | 'header' | 'footer' | 'dl';

interface LayoutProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** The element to render. Defaults to `div`. */
  as?: LayoutElement;
  gap?: Gap;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export interface StackProps extends LayoutProps {
  /** Cross-axis alignment. Defaults to `stretch` (children fill the width). */
  align?: Align;
}

/** Children in a column, evenly spaced. The default container for page and card content. */
export function Stack({
  as = 'div',
  gap = 'md',
  align = 'stretch',
  className,
  children,
  ...rest
}: StackProps) {
  const Element = as as ElementType;
  return (
    <Element
      className={cn('flex min-w-0 flex-col', gapClasses[gap], alignClasses[align], className)}
      {...rest}
    >
      {children}
    </Element>
  );
}

export interface InlineProps extends LayoutProps {
  /** Defaults to `center`. */
  align?: Align;
  /** Defaults to `start`. */
  justify?: Justify;
  /** Wraps onto more lines when space runs out. Defaults to true. */
  allowsWrapping?: boolean;
}

/** Children in a row (wrapping on narrow screens), for toolbars, badges and label/value pairs. */
export function Inline({
  as = 'div',
  gap = 'sm',
  align = 'center',
  justify = 'start',
  allowsWrapping = true,
  className,
  children,
  ...rest
}: InlineProps) {
  const Element = as as ElementType;
  return (
    <Element
      className={cn(
        'flex min-w-0',
        allowsWrapping && 'flex-wrap',
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  );
}

type Columns = 1 | 2 | 3 | 4 | 5 | 6;

const baseCols: Record<Columns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};
const smCols: Record<Columns, string> = {
  1: '@sm:grid-cols-1',
  2: '@sm:grid-cols-2',
  3: '@sm:grid-cols-3',
  4: '@sm:grid-cols-4',
  5: '@sm:grid-cols-5',
  6: '@sm:grid-cols-6',
};
const mdCols: Record<Columns, string> = {
  1: '@2xl:grid-cols-1',
  2: '@2xl:grid-cols-2',
  3: '@2xl:grid-cols-3',
  4: '@2xl:grid-cols-4',
  5: '@2xl:grid-cols-5',
  6: '@2xl:grid-cols-6',
};
const lgCols: Record<Columns, string> = {
  1: '@5xl:grid-cols-1',
  2: '@5xl:grid-cols-2',
  3: '@5xl:grid-cols-3',
  4: '@5xl:grid-cols-4',
  5: '@5xl:grid-cols-5',
  6: '@5xl:grid-cols-6',
};

/**
 * Columns by the grid's own width (container queries), so a grid inside a narrow card or drawer stays readable:
 * `base` always, `sm` from 24rem, `md` from 42rem, `lg` from 64rem.
 */
export interface GridColumns {
  base?: Columns;
  sm?: Columns;
  md?: Columns;
  lg?: Columns;
}

export interface GridProps extends LayoutProps {
  /** Columns by container width. Defaults to one column, two from `md`. */
  columns?: GridColumns;
  /** Instead of `columns`: as many columns as fit, each at least this wide (CSS length, for example `16rem`). */
  minItemWidth?: string;
}

/** Children in a responsive grid that adapts to its container's width, not the screen's. */
export function Grid({
  as = 'div',
  gap = 'md',
  columns = { base: 1, md: 2 },
  minItemWidth,
  className,
  children,
  ...rest
}: GridProps) {
  const Element = as as ElementType;
  const columnClasses = minItemWidth
    ? undefined
    : cn(
        baseCols[columns.base ?? 1],
        columns.sm && smCols[columns.sm],
        columns.md && mdCols[columns.md],
        columns.lg && lgCols[columns.lg],
      );
  return (
    // The wrapper is the query container; the grid inside it reacts to its width.
    <div className="@container min-w-0">
      <Element
        className={cn('grid min-w-0', gapClasses[gap], columnClasses, className)}
        // Dynamic geometry: the minimum column width is the app's value, so it can't be a class.
        // eslint-disable-next-line no-restricted-syntax
        style={
          minItemWidth
            ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(${minItemWidth}, 100%), 1fr))` }
            : undefined
        }
        {...rest}
      >
        {children}
      </Element>
    </div>
  );
}

export interface SpacerProps {
  className?: string;
}

/** Takes the free space in an Inline, pushing what follows to the end. */
export function Spacer({ className }: SpacerProps) {
  return <span aria-hidden="true" className={cn('flex-1', className)} />;
}
