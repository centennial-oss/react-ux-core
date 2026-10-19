// Lexical's theme for the RichTextEditor: classes Lexical puts on the elements it renders. They mirror Prose (the
// spacing, headings, lists, quotes, tables and inline code that rendered Markdown uses) and CodeBlock's colours, so
// a document looks the same while it's edited as when it's shown.
import type { EditorThemeClasses } from 'lexical';

export const editorTheme: EditorThemeClasses = {
  paragraph: 'my-3 leading-relaxed',
  heading: {
    h1: 'mt-8 mb-3 text-2xl font-semibold tracking-tight',
    h2: 'mt-8 mb-3 text-xl font-semibold tracking-tight',
    h3: 'mt-6 mb-2 text-lg font-semibold tracking-tight',
    h4: 'mt-5 mb-2 text-base font-semibold',
    h5: 'mt-4 mb-1 text-sm font-semibold',
    h6: 'mt-4 mb-1 text-sm font-semibold text-fg-muted',
  },
  quote: 'my-3 border-s-4 border-border-strong ps-4 text-fg-muted',
  list: {
    ul: 'my-3 list-disc ps-6',
    ol: 'my-3 list-decimal ps-6',
    checklist: 'my-3 list-none ps-0',
    listitem: 'mt-1 marker:text-fg-muted',
    listitemUnchecked: [
      'relative list-none ps-7 outline-none',
      "before:absolute before:start-0 before:top-[0.2em] before:size-[1.1em] before:cursor-pointer before:rounded-[0.25rem] before:border before:border-border-strong before:bg-surface-2 before:content-['']",
    ].join(' '),
    listitemChecked: [
      'relative list-none ps-7 text-fg-muted line-through outline-none',
      "before:absolute before:start-0 before:top-[0.2em] before:size-[1.1em] before:cursor-pointer before:rounded-[0.25rem] before:border before:border-accent-solid before:bg-accent-solid before:content-['']",
      "after:pointer-events-none after:absolute after:start-[0.4em] after:top-[0.35em] after:h-[0.6em] after:w-[0.3em] after:rotate-45 after:border-e-2 after:border-b-2 after:border-accent-on-solid after:content-['']",
    ].join(' '),
    nested: { listitem: 'list-none before:hidden after:hidden' },
  },
  link: 'font-medium text-accent-fg underline underline-offset-2',
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: '[text-decoration-line:underline_line-through]',
    code: 'rounded-[0.25rem] border border-border bg-code-bg px-1 py-px font-mono text-[0.875em] text-code-fg',
  },
  code: [
    // Long lines wrap rather than scroll: a scrolling block inside the editable text couldn't be reached by keyboard.
    'relative my-3 block rounded-control border border-border bg-code-bg p-3',
    'font-mono text-xs leading-relaxed whitespace-pre-wrap text-code-fg [overflow-wrap:anywhere] [tab-size:2] sm:text-sm',
  ].join(' '),
  codeHighlight: {
    keyword: 'text-code-keyword',
    string: 'text-code-string',
    number: 'text-code-number',
    comment: 'text-code-comment italic',
    punct: 'text-code-punct',
    property: 'text-code-property',
  },
  hr: 'my-6 border-border',
  image: 'inline-block max-w-full',
  mention: 'rounded-[0.25rem] bg-accent-bg px-0.5 font-medium text-accent-fg',
  tableScrollableWrapper: 'my-3 max-w-full overflow-x-auto',
  table: 'w-full border-collapse text-sm',
  tableRow: '',
  tableCell: 'min-w-12 border border-border px-2 py-1.5 text-start align-top [&>p]:my-0',
  tableCellHeader: 'bg-surface-2 font-semibold',
  tableCellSelected: 'bg-accent-bg',
  tableSelection: 'selection:bg-transparent',
};
