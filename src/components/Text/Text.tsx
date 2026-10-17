// Text and Heading: page copy (intros, notes, figures) and section headings in the type scale and token colours.
// Components render their own headings and labels; these are for the app's own content.
import type { ElementType, HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

export type TextVariant = 'body' | 'muted' | 'small' | 'lead';

const variantClasses: Record<TextVariant, string> = {
  body: 'text-sm text-fg',
  muted: 'text-sm text-fg-muted',
  small: 'text-xs text-fg-muted',
  lead: 'text-base text-fg sm:text-lg',
};

const lineClasses = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
} as const;

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  /** `body` (the default), `muted` for secondary details, `small` for notes, `lead` for a page's intro. */
  variant?: TextVariant;
  /** `p` for paragraphs (the default), `span` inside other text, or `div`. */
  as?: 'p' | 'span' | 'div';
  /** Clamps to this many lines with an ellipsis. The full text stays in the page for screen readers. */
  lines?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
}

/** Body text in the app's type scale and token colours. */
export function Text({
  variant = 'body',
  as = 'p',
  lines,
  className,
  children,
  ...rest
}: TextProps) {
  const Element = as as ElementType;
  return (
    <Element
      {...rest}
      className={cn(variantClasses[variant], lines && lineClasses[lines], className)}
    >
      {children}
    </Element>
  );
}

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
