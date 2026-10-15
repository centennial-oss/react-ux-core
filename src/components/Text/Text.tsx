// Text and Heading: page copy (intros, notes, figures) and section headings in the type scale and token colours.
// Components render their own headings and labels; these are for the app's own content.
import type { ElementType, HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type TextTone = 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const sizeClasses: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const toneClasses: Record<TextTone, string> = {
  default: 'text-fg',
  muted: 'text-fg-muted',
  accent: 'text-accent-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
  info: 'text-info-fg',
};

const weightClasses = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** `p` for paragraphs (the default), `span` inside other text. */
  as?: 'p' | 'span' | 'div' | 'strong' | 'small';
  /** Defaults to `sm`, the body size of the app. */
  size?: TextSize;
  /** Defaults to `default`. */
  tone?: TextTone;
  weight?: keyof typeof weightClasses;
  /** Monospaced, for serials, keys and codes. */
  isMono?: boolean;
  /** Tabular figures, for numbers that line up. */
  isNumeric?: boolean;
  /** One line with an ellipsis. */
  isTruncated?: boolean;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/** Body text in the app's type scale and token colours. */
export function Text({
  as = 'p',
  size = 'sm',
  tone = 'default',
  weight,
  isMono,
  isNumeric,
  isTruncated,
  className,
  children,
  ...rest
}: TextProps) {
  const Element = as as ElementType;
  return (
    <Element
      className={cn(
        sizeClasses[size],
        toneClasses[tone],
        weight && weightClasses[weight],
        isMono && 'font-mono',
        isNumeric && 'tabular-nums',
        isTruncated && 'truncate',
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  );
}

export interface HeadingProps extends Omit<
  HTMLAttributes<HTMLHeadingElement>,
  'className' | 'style'
> {
  /** The heading element (h2–h6; PageHeader owns the page's h1). */
  level: 2 | 3 | 4 | 5 | 6;
  /** Defaults by level: 2 → lg, 3 → md, 4+ → sm. */
  size?: TextSize;
  tone?: TextTone;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLHeadingElement>;
}

const headingSize: Record<HeadingProps['level'], TextSize> = {
  2: 'lg',
  3: 'md',
  4: 'sm',
  5: 'sm',
  6: 'xs',
};

/** A section heading below the page title. */
export function Heading({
  level,
  size,
  tone = 'default',
  className,
  children,
  ...rest
}: HeadingProps) {
  const Element = `h${level}` as const;
  return (
    <Element
      className={cn(
        'font-semibold tracking-tight',
        sizeClasses[size ?? headingSize[level]],
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  );
}
