// Markdown: CommonMark plus GFM (tables, task lists, strikethrough, autolinks) rendered as React elements through
// Prose. Raw HTML in the source is never rendered (there's no rehype-raw): it shows as text. Headings shift under the
// page's own, links go through the app's LinkComponent (external ones get rel="noopener noreferrer"), and fenced code
// renders through CodeBlock. With `hasMath`, `$…$` and `$$…$$` render as formulas (see remarkMath.ts and
// MarkdownMath.tsx: the maths converter loads on demand, so `/markdown` doesn't need Temml unless formulas appear).

import {
  Children,
  isValidElement,
  useMemo,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../code/CodeBlock';
import type { CodeLanguage } from '../code/tokenize';
import { Prose } from '../components/Prose/Prose';
import { useLinkComponent } from '../provider/context';
import type { HeadingLevel } from '../utils/types';
import { MarkdownMath } from './MarkdownMath';
import { useMarkdownMessages } from './messages';
import { extractMath, remarkMath } from './remarkMath';

const languageAliases: Record<string, CodeLanguage> = {
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  hcl: 'hcl',
  tf: 'hcl',
  terraform: 'hcl',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'typescript',
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'javascript',
  go: 'go',
  golang: 'go',
  python: 'python',
  py: 'python',
  sql: 'sql',
};

/** A column's alignment from GFM (`:--:`), as a class. */
const alignClasses: Record<string, string | undefined> = {
  left: 'text-start',
  center: 'text-center',
  right: 'text-end',
};

/** The text of a code element's children. */
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child: ReactNode) => textOf(child)).join('');
  }
  return '';
}

/** Whether `href` leaves the app: an absolute URL on another origin. */
function isExternal(href: string): boolean {
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

export interface MarkdownProps {
  /** The Markdown source: CommonMark plus GFM (tables, task lists, strikethrough, autolinks). */
  children: string;
  /** The level the source's top heading (`#`) renders at. Defaults to 2, so content fits under the page's h1. */
  headingLevel?: HeadingLevel;
  /** Renders fenced code through CodeBlock (colours, copy, wrap). Defaults to true; otherwise plain monospace. */
  hasCodeBlocks?: boolean;
  /** Opens links to other sites in a new tab, with a hidden "opens in a new tab" for screen readers. Defaults to true. */
  shouldOpenExternalLinksInNewTab?: boolean;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  /** Lets lines run the full width instead of a readable length. */
  isFullWidth?: boolean;
  /**
   * Renders TeX between `$…$` (inline) and `$$…$$` (block) as formulas, through `/math`'s MathFormula, which loads
   * on demand and needs the optional peer temml. `\ce{…}` works for chemistry. A `$` before a digit or a space
   * (currency) stays text, and `\$` is a literal dollar sign. Defaults to false.
   */
  hasMath?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Markdown as styled rich text, with no raw HTML. */
export function Markdown({
  children,
  headingLevel = 2,
  hasCodeBlocks = true,
  shouldOpenExternalLinksInNewTab = true,
  size = 'md',
  isFullWidth,
  hasMath = false,
  className,
  ref,
}: MarkdownProps) {
  const messages = useMarkdownMessages();
  const Link = useLinkComponent();
  const math = useMemo(() => (hasMath ? extractMath(children) : null), [hasMath, children]);
  const remarkPlugins: NonNullable<Options['remarkPlugins']> = useMemo(
    () => (math ? [remarkGfm, [remarkMath, { formulas: math.formulas }]] : [remarkGfm]),
    [math],
  );

  const heading =
    (depth: number) =>
    ({ children: content, id }: HTMLAttributes<HTMLHeadingElement>) => {
      const level = Math.min(6, depth + headingLevel - 1);
      const Element = `h${String(level)}` as 'h2';
      return <Element id={id}>{content}</Element>;
    };

  const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    a: ({ href, children: content, title }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
      if (href === undefined) {
        return <span>{content}</span>;
      }
      if (isExternal(href)) {
        const isNewTab = shouldOpenExternalLinksInNewTab;
        return (
          <a
            href={href}
            title={title}
            rel="noopener noreferrer"
            target={isNewTab ? '_blank' : undefined}
          >
            {content}
            {isNewTab && <span className="sr-only"> {messages.opensInNewTab}</span>}
          </a>
        );
      }
      return (
        <Link href={href} title={title}>
          {content}
        </Link>
      );
    },
    pre: ({ children: content }) => {
      const code = Children.toArray(content).find(isValidElement) as
        ReactElement<{ className?: string; children?: ReactNode }> | undefined;
      const source = textOf(code?.props.children).replace(/\n$/, '');
      const name = /language-([\w-]+)/.exec(code?.props.className ?? '')?.[1]?.toLowerCase();
      if (!hasCodeBlocks) {
        return (
          <pre>
            <code>{source}</code>
          </pre>
        );
      }
      const language = name === undefined ? 'text' : (languageAliases[name] ?? 'text');
      return (
        <div className="my-[1em]">
          <CodeBlock
            code={source}
            language={language}
            aria-label={messages.codeBlockLabel({ language: name ?? '' })}
          />
        </div>
      );
    },
    table: ({ children: content }) => (
      <div
        role="region"
        aria-label={messages.markdownTable}
        // Wide tables scroll inside this region, which takes focus so keyboard users can scroll it.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table>{content}</table>
      </div>
    ),
    th: ({ children: content, style }) => (
      <th scope="col" className={alignClasses[String(style?.textAlign)]}>
        {content}
      </th>
    ),
    td: ({ children: content, style }) => (
      <td className={alignClasses[String(style?.textAlign)]}>{content}</td>
    ),
    li: ({ children: content, className: itemClass }) =>
      itemClass?.includes('task-list-item') ? (
        // A task's checkbox is named by its text.
        <li className="list-none">
          <label className="inline-flex items-baseline gap-2">{content}</label>
        </li>
      ) : (
        <li>{content}</li>
      ),
    input: ({ checked, type }) =>
      type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={checked}
          disabled
          readOnly
          className="-ms-6 size-4 accent-accent-solid"
        />
      ) : null,
    // Formulas from remarkMath; other spans and divs (none come from Markdown itself) render as they are.
    span: ({ node, children: content, className: spanClass }) => {
      const tex = node?.properties.dataTex;
      return node?.properties.dataMath === 'inline' && typeof tex === 'string' ? (
        <MarkdownMath tex={tex} display="inline" />
      ) : (
        <span className={spanClass}>{content}</span>
      );
    },
    div: ({ node, children: content, className: divClass }) => {
      const tex = node?.properties.dataTex;
      return node?.properties.dataMath === 'block' && typeof tex === 'string' ? (
        <MarkdownMath tex={tex} display="block" />
      ) : (
        <div className={divClass}>{content}</div>
      );
    },
  };

  return (
    <Prose ref={ref} size={size} isFullWidth={isFullWidth} className={className}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {math ? math.markdown : children}
      </ReactMarkdown>
    </Prose>
  );
}
