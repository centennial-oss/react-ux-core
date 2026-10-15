// Pieces shared by the table and card views: cell content, the row link, and pointer row activation.

import type { MouseEvent, ReactNode } from 'react';
import { Link as AriaLink } from 'react-aria-components';
import { useLinkComponent } from '../provider/context';
import { cn } from '../utils/cn';
import type { DataTableColumn } from './types';

/** The value-and-render pair for one cell. */
export function renderCell<Row>(
  column: DataTableColumn<Row>,
  row: Row,
  rowIndex: number,
): ReactNode {
  const value = column.value?.(row);
  if (column.cell) {
    return column.cell({ row, value, rowIndex });
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

/** A real link (through the app's LinkComponent) around the row's primary content. */
export function RowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const LinkComponent = useLinkComponent();
  return (
    <AriaLink
      href={href}
      data-row-link=""
      render={(props) => ('href' in props ? <LinkComponent {...props} /> : <span {...props} />)}
      className={cn(
        'rounded-sm font-medium text-fg underline-offset-2 outline-none hover:underline data-focus-visible:focus-ring',
        className,
      )}
    >
      {children}
    </AriaLink>
  );
}

const INTERACTIVE =
  'a, button, input, select, textarea, label, [role="button"], [role="checkbox"], [role="menu"], [role="dialog"]';

/**
 * Pointer convenience for linked rows: a click anywhere on the row follows its link (keyboard and screen reader
 * users use the link itself). Clicks on controls, text selections and non-primary buttons are left alone.
 */
export function activateRowLink(event: MouseEvent<HTMLElement>) {
  const target = event.target as Element;
  if (event.button !== 0 || target.closest(INTERACTIVE) || window.getSelection()?.toString()) {
    return;
  }
  const link = event.currentTarget.querySelector<HTMLAnchorElement>('[data-row-link]');
  link?.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    }),
  );
}

export const alignClasses = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
} as const;
