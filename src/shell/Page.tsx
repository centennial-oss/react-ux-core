// Page: the frame of one screen inside the AppShell's main area: the PageHeader, then the content, in a
// width-limited column.
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { PageHeader, type PageHeaderProps } from './PageHeader';

export interface PageProps extends Omit<PageHeaderProps, 'children' | 'className' | 'ref'> {
  /**
   * The page's content. With `tabs`, these are the `TabPanel`s (rendered by PageHeader); without, anything.
   */
  children?: ReactNode;
  /** Content between the header and the body, such as a page-level Banner. */
  notices?: ReactNode;
  /** Caps the content width for reading-heavy pages (forms, settings). Defaults to `full`. */
  width?: 'narrow' | 'medium' | 'full';
  className?: string;
}

const widthClasses = {
  narrow: 'max-w-3xl',
  medium: 'max-w-5xl',
  full: 'max-w-[96rem]',
} as const;

/** One screen: header (title, breadcrumbs, actions, tabs) over the content. */
export function Page({ children, notices, width = 'full', className, tabs, ...header }: PageProps) {
  return (
    <div
      className={cn('mx-auto flex w-full min-w-0 flex-col gap-6', widthClasses[width], className)}
    >
      {tabs ? (
        <>
          {notices}
          <PageHeader tabs={tabs} {...header}>
            {children}
          </PageHeader>
        </>
      ) : (
        <>
          <PageHeader {...header} />
          {notices}
          {children}
        </>
      )}
    </div>
  );
}
