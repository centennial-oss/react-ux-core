// Prose: styles plain rich-text children (paragraphs, lists, links, emphasis, inline code, quotes, h2–h4, tables,
// rules) with the tokens, for explanations and long-form content. Markdown renders through it.
import type { ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

const baseClasses = [
  'min-w-0 text-fg [overflow-wrap:anywhere]',
  '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
  '[&_p]:leading-relaxed',
  '[&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6 [&_li]:mt-1 [&_li>p]:mb-1',
  '[&_li::marker]:text-fg-muted',
  '[&_a]:font-medium [&_a]:text-accent-fg [&_a]:underline [&_a]:underline-offset-2',
  '[&_a:hover]:decoration-2 [&_a:focus-visible]:rounded-[0.125rem] [&_a:focus-visible]:focus-ring',
  '[&_strong]:font-semibold [&_em]:italic [&_del]:line-through',
  '[&_:not(pre)>code]:rounded-[0.25rem] [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border',
  '[&_:not(pre)>code]:bg-code-bg [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-px',
  '[&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.875em] [&_:not(pre)>code]:text-code-fg',
  '[&_pre:not([data-code-block])]:overflow-x-auto [&_pre:not([data-code-block])]:rounded-control [&_pre:not([data-code-block])]:border [&_pre:not([data-code-block])]:border-border [&_pre:not([data-code-block])]:bg-code-bg',
  '[&_pre:not([data-code-block])]:p-3 [&_pre:not([data-code-block])]:font-mono [&_pre:not([data-code-block])]:text-code-fg',
  '[&_blockquote]:border-s-4 [&_blockquote]:border-border-strong [&_blockquote]:ps-4 [&_blockquote]:text-fg-muted',
  '[&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:font-semibold [&_h3]:tracking-tight',
  '[&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold',
  '[&_hr]:border-border',
  '[&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-border-strong [&_th:not(.text-center,.text-end)]:text-start',
  '[&_th]:font-semibold [&_td]:border-b [&_td]:border-border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1.5 [&_td]:py-1.5',
  '[&_img]:max-w-full [&_img]:rounded-control',
].join(' ');

const sizeClasses = {
  sm: [
    'text-sm',
    '[&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_blockquote]:my-3 [&_pre:not([data-code-block])]:my-3 [&_table]:my-3 [&_hr]:my-5',
    '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-sm',
    '[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-sm [&_pre:not([data-code-block])]:text-xs',
  ].join(' '),
  md: [
    'text-base',
    '[&_p]:my-4 [&_ul]:my-4 [&_ol]:my-4 [&_blockquote]:my-4 [&_pre:not([data-code-block])]:my-4 [&_table]:my-4 [&_hr]:my-6',
    '[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg',
    '[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-base [&_pre:not([data-code-block])]:text-sm [&_table]:text-sm',
  ].join(' '),
} as const;

export interface ProseProps {
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  /** Lets lines run the full width instead of a readable length of about 70 characters. */
  isFullWidth?: boolean;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** Rich text (p, ul, ol, li, a, strong, em, code, pre, blockquote, h2–h4, table, hr) styled with the tokens. */
export function Prose({ size = 'md', isFullWidth = false, className, children, ref }: ProseProps) {
  return (
    <div
      ref={ref}
      className={cn(baseClasses, sizeClasses[size], !isFullWidth && 'max-w-[70ch]', className)}
    >
      {children}
    </div>
  );
}
