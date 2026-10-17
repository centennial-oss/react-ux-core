// Layout primitives: Stack (a column or row), Inline (a wrapping row), Grid (columns by the container's own width) and
// Spacer, so screens lay out content without bare divs. Every class comes from a lookup table.

import {
  Children,
  isValidElement,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '../../utils/cn';

/** Space between children, mapped to the spacing scale (0, 0.25, 0.5, 1, 1.5 and 2rem). */
export type Space = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const gapClasses: Record<Space, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between';

const alignClasses: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyClasses: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

/** Elements a layout primitive renders as. Lists wrap each child in an `li`. */
export type LayoutElement = 'div' | 'section' | 'ul' | 'ol';

interface LayoutProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children'
> {
  /** Defaults to `md`. */
  gap?: Space;
  /** The element to render. Defaults to `div`. Lists render each child in an `li`; a `section` needs a label. */
  as?: LayoutElement;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/** The children, each in an `li` when the element is a list, so list semantics hold. */
function layoutChildren(as: LayoutElement, children: ReactNode, itemClassName?: string): ReactNode {
  if (as !== 'ul' && as !== 'ol') {
    return children;
  }
  return Children.toArray(children).map((child, index) => (
    <li
      key={isValidElement(child) && child.key !== null ? child.key : index}
      className={cn('min-w-0', itemClassName)}
    >
      {child}
    </li>
  ));
}

export interface StackProps extends LayoutProps {
  /** Defaults to `column`. */
  direction?: 'column' | 'row';
  /** Cross-axis alignment. Defaults to `stretch` in a column (children fill the width) and `center` in a row. */
  align?: StackAlign;
  justify?: StackJustify;
  /** Lets a row wrap onto more lines when space runs out. Defaults to false. */
  isWrapping?: boolean;
}

/** Children in a column (or a row), evenly spaced. The default container for page and card content. */
export function Stack({
  direction = 'column',
  gap = 'md',
  align,
  justify,
  isWrapping = false,
  as = 'div',
  className,
  children,
  ...rest
}: StackProps) {
  const Element = as as ElementType;
  const isRow = direction === 'row';
  return (
    <Element
      {...rest}
      className={cn(
        'flex min-w-0',
        isRow ? 'flex-row' : 'flex-col',
        isWrapping && 'flex-wrap',
        (as === 'ul' || as === 'ol') && 'list-none',
        gapClasses[gap],
        alignClasses[align ?? (isRow ? 'center' : 'stretch')],
        justify && justifyClasses[justify],
        className,
      )}
    >
      {layoutChildren(as, children)}
    </Element>
  );
}

export interface InlineProps extends Omit<StackProps, 'direction'> {
  /** Defaults to `sm`. */
  gap?: Space;
}

/** A row that wraps on narrow screens, for toolbars, badges and label/value pairs: `Stack direction="row"`. */
export function Inline({ gap = 'sm', isWrapping = true, ...rest }: InlineProps) {
  return <Stack {...rest} direction="row" gap={gap} isWrapping={isWrapping} />;
}

export type Columns = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Columns by the grid's own width (container queries), so a grid inside a narrow card or drawer stays readable: `base`
 * always, `sm` from 24rem, `md` from 42rem, `lg` from 64rem and `xl` from 80rem.
 */
export interface GridColumns {
  base?: Columns;
  sm?: Columns;
  md?: Columns;
  lg?: Columns;
  xl?: Columns;
}

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
const xlCols: Record<Columns, string> = {
  1: '@7xl:grid-cols-1',
  2: '@7xl:grid-cols-2',
  3: '@7xl:grid-cols-3',
  4: '@7xl:grid-cols-4',
  5: '@7xl:grid-cols-5',
  6: '@7xl:grid-cols-6',
};

export type MinItemWidth = '8rem' | '12rem' | '16rem' | '20rem' | '24rem';

const minItemWidthClasses: Record<MinItemWidth, string> = {
  '8rem': 'grid-cols-[repeat(auto-fit,minmax(min(8rem,100%),1fr))]',
  '12rem': 'grid-cols-[repeat(auto-fit,minmax(min(12rem,100%),1fr))]',
  '16rem': 'grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))]',
  '20rem': 'grid-cols-[repeat(auto-fit,minmax(min(20rem,100%),1fr))]',
  '24rem': 'grid-cols-[repeat(auto-fit,minmax(min(24rem,100%),1fr))]',
};

export interface GridProps extends LayoutProps {
  /** A fixed count, or counts by container width. Defaults to `{ base: 1, sm: 2, lg: 3 }`. */
  columns?: Columns | GridColumns;
  /** Instead of `columns`: as many columns as fit, each at least this wide. */
  minItemWidth?: MinItemWidth;
}

function columnClasses(columns: Columns | GridColumns): string {
  if (typeof columns === 'number') {
    return baseCols[columns];
  }
  return cn(
    baseCols[columns.base ?? 1],
    columns.sm && smCols[columns.sm],
    columns.md && mdCols[columns.md],
    columns.lg && lgCols[columns.lg],
    columns.xl && xlCols[columns.xl],
  );
}

/**
 * Children in a grid that adapts to its container's width, not the screen's. The grid sits in a query container
 * (a plain `div`); `className`, `ref` and other props go to the grid element itself.
 */
export function Grid({
  gap = 'md',
  columns = { base: 1, sm: 2, lg: 3 },
  minItemWidth,
  as = 'div',
  className,
  children,
  ...rest
}: GridProps) {
  const Element = as as ElementType;
  return (
    <div className="@container min-w-0">
      <Element
        {...rest}
        className={cn(
          'grid min-w-0',
          (as === 'ul' || as === 'ol') && 'list-none',
          gapClasses[gap],
          minItemWidth ? minItemWidthClasses[minItemWidth] : columnClasses(columns),
          className,
        )}
      >
        {layoutChildren(as, children)}
      </Element>
    </div>
  );
}

export interface SpacerProps {
  className?: string;
}

/** Takes the free space in a row, pushing what follows to the end. */
export function Spacer({ className }: SpacerProps) {
  return <span aria-hidden="true" className={cn('flex-1', className)} />;
}
