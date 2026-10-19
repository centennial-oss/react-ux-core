import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

export type ButtonGroupLayout = 'start' | 'end' | 'between' | 'stretch';

const layoutClasses: Record<ButtonGroupLayout, string> = {
  start: '@sm:justify-start',
  end: '@sm:justify-end',
  between: '@sm:justify-between',
  stretch: '@sm:*:flex-1',
};

export interface ButtonGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'children'
> {
  /** How the buttons sit in a wide container. Defaults to `end` (dialog and form footers). */
  layout?: ButtonGroupLayout;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Lays out a row of buttons, for example a dialog or form footer. In narrow containers (under 24rem) the buttons
 * stack full width, with the last one (usually the primary action) on top.
 */
export function ButtonGroup({ layout = 'end', className, children, ...rest }: ButtonGroupProps) {
  return (
    <div className={cn('@container w-full', className)}>
      <div
        role={
          rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined
            ? 'group'
            : undefined
        }
        {...rest}
        className={cn(
          'flex flex-col-reverse gap-2 *:w-full @sm:flex-row @sm:flex-wrap @sm:items-center @sm:*:w-auto',
          layoutClasses[layout],
        )}
      >
        {children}
      </div>
    </div>
  );
}
