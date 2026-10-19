// The frame every toolbar shares: React Aria's Toolbar (one Tab stop, arrow keys between controls) laid out as a row
// or a column. Toolbar adds overflowing items on top of it. Toolbars made only of their own controls (the Markdown and
// rich-text editors', Canvas's zoom controls) use the frame directly, so they don't bundle the overflow menu.
import type { Ref } from 'react';
import {
  Toolbar as AriaToolbar,
  type ToolbarProps as AriaToolbarProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';

export type ToolbarOrientation = 'horizontal' | 'vertical';

const frameClasses: Record<ToolbarOrientation, string> = {
  horizontal: 'flex flex-row items-center gap-1',
  vertical: 'flex flex-col items-center gap-1',
};

export interface ToolbarFrameProps extends Omit<
  AriaToolbarProps,
  'className' | 'style' | 'render'
> {
  /** Classes for the root element, merged over the layout for the orientation. */
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** React Aria's Toolbar with the library's layout for its orientation. */
export function ToolbarFrame({
  orientation = 'horizontal',
  className,
  ...rest
}: ToolbarFrameProps) {
  return (
    <AriaToolbar
      {...rest}
      orientation={orientation}
      className={cn(frameClasses[orientation], className)}
    />
  );
}
