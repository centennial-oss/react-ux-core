// Code: a short piece of code in running text (a key name, a command, a file path). For blocks, use CodeBlock from
// `/code`.
import type { ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

/** The inline code look, shared with Prose and Markdown. */
export const inlineCodeClasses =
  'rounded-[0.25rem] border border-border bg-code-bg px-1 py-px font-mono text-[0.875em] text-code-fg [overflow-wrap:anywhere]';

export interface CodeProps {
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** Code in running text, in a monospaced face on the code background. */
export function Code({ children, className, ref }: CodeProps) {
  return (
    <code ref={ref} className={cn(inlineCodeClasses, className)}>
      {children}
    </code>
  );
}
