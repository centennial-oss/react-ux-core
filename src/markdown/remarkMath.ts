// `$…$` and `$$…$$` maths in Markdown, without remark-math. It works in two steps, because the Markdown parser
// would otherwise eat TeX's backslash escapes (`\\`, `\{`, `\,`) and read `*` or `_` as emphasis:
//
// 1. `extractMath` scans the source before parsing. It skips fenced code and code spans, leaves escaped `\$` alone,
//    and swaps each formula for a private-use placeholder the parser passes through untouched. Currency isn't maths:
//    the opening `$` must be followed by a non-space, the closing `$` preceded by a non-space and not followed by a
//    digit, and an inline formula can't contain another unescaped `$`, a backtick or a blank line ("$5 and $10"
//    stays text).
// 2. `remarkMath` (a remark plugin) turns the placeholders back into `inlineMath` and `math` nodes, which render as
//    `<span data-math="inline">` and `<div data-math="block">` for Markdown's components to replace. A `$$…$$` block
//    gets its own block, splitting the paragraph around it. Placeholders that landed in code, link URLs or titles get
//    their original source back.

/** A formula found in the source. */
export interface MarkdownFormula {
  tex: string;
  display: 'inline' | 'block';
  /** The original source, `$` signs included, restored where the formula isn't rendered (such as in code). */
  raw: string;
}

const INLINE_OPEN = '';
const INLINE_CLOSE = '';
const BLOCK_OPEN = '';
const BLOCK_CLOSE = '';
const placeholderPattern = /(\d+)|(\d+)/g;

const isSpace = (character: string | undefined) => character === undefined || /\s/.test(character);
const isDigit = (character: string | undefined) =>
  character !== undefined && character >= '0' && character <= '9';

/** Replaces the formulas in one run of non-code lines (no blank lines inside). */
function scanText(text: string, formulas: MarkdownFormula[]): string {
  let result = '';
  let index = 0;
  const add = (formula: MarkdownFormula) => {
    formulas.push(formula);
    const id = String(formulas.length - 1);
    return formula.display === 'block'
      ? `${BLOCK_OPEN}${id}${BLOCK_CLOSE}`
      : `${INLINE_OPEN}${id}${INLINE_CLOSE}`;
  };
  while (index < text.length) {
    const character = text.charAt(index);
    if (character === '\\') {
      // An escape (including `\$`) passes through for the Markdown parser.
      result += text.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (character === '`') {
      // A code span: from a run of backticks to the next run of the same length.
      let run = 1;
      while (text.charAt(index + run) === '`') {
        run += 1;
      }
      const fence = '`'.repeat(run);
      let close = text.indexOf(fence, index + run);
      while (close !== -1 && text.charAt(close + run) === '`') {
        let end = close;
        while (text.charAt(end) === '`') {
          end += 1;
        }
        close = text.indexOf(fence, end);
      }
      const end = close === -1 ? index + run : close + run;
      result += text.slice(index, end);
      index = end;
      continue;
    }
    if (character !== '$') {
      result += character;
      index += 1;
      continue;
    }
    if (text.charAt(index + 1) === '$') {
      // Display maths: to the next unescaped `$$`.
      let close = index + 2;
      while (close < text.length) {
        if (text.charAt(close) === '\\') {
          close += 2;
          continue;
        }
        if (text.startsWith('$$', close)) {
          break;
        }
        close += 1;
      }
      const tex = text.slice(index + 2, close).trim();
      if (close < text.length && tex !== '') {
        result += add({ tex, display: 'block', raw: text.slice(index, close + 2) });
        index = close + 2;
      } else {
        result += '$$';
        index += 2;
      }
      continue;
    }
    // Inline maths: the opening `$` needs a non-space after it.
    let close = -1;
    if (!isSpace(text.charAt(index + 1))) {
      for (let scan = index + 1; scan < text.length; scan += 1) {
        const next = text.charAt(scan);
        if (next === '\\') {
          scan += 1;
          continue;
        }
        if (next === '`') {
          // A formula doesn't run into a code span.
          break;
        }
        if (next === '$') {
          const isCloser =
            !isSpace(text.charAt(scan - 1)) &&
            !isDigit(text.charAt(scan + 1)) &&
            text.charAt(scan + 1) !== '$';
          close = isCloser ? scan : -1;
          break;
        }
      }
    }
    if (close === -1) {
      result += '$';
      index += 1;
    } else {
      result += add({
        tex: text.slice(index + 1, close),
        display: 'inline',
        raw: text.slice(index, close + 1),
      });
      index = close + 1;
    }
  }
  return result;
}

/** Swaps the formulas in Markdown source for placeholders, and returns them in order. */
export function extractMath(markdown: string): { markdown: string; formulas: MarkdownFormula[] } {
  const formulas: MarkdownFormula[] = [];
  const lines = markdown.split('\n');
  const output: string[] = [];
  let pending: string[] = [];
  let fence: { character: string; length: number } | null = null;
  const flush = () => {
    if (pending.length > 0) {
      output.push(scanText(pending.join('\n'), formulas));
      pending = [];
    }
  };
  for (const line of lines) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      output.push(line);
      if (
        fenceMatch?.[1]?.startsWith(fence.character) === true &&
        fenceMatch[1].length >= fence.length &&
        line.trim() === fenceMatch[1]
      ) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch?.[1]) {
      flush();
      fence = { character: fenceMatch[1].charAt(0), length: fenceMatch[1].length };
      output.push(line);
      continue;
    }
    if (line.trim() === '') {
      flush();
      output.push(line);
      continue;
    }
    pending.push(line);
  }
  flush();
  return { markdown: output.join('\n'), formulas };
}

// The parts of mdast this plugin touches.
interface MdNode {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  alt?: string | null;
  children?: MdNode[];
  data?: Record<string, unknown>;
}

function mathNode(formula: MarkdownFormula, display: 'inline' | 'block'): MdNode {
  const isBlock = display === 'block';
  return {
    type: isBlock ? 'math' : 'inlineMath',
    value: formula.tex,
    data: {
      hName: isBlock ? 'div' : 'span',
      hProperties: { dataMath: display, dataTex: formula.tex },
      hChildren: [{ type: 'text', value: formula.tex }],
    },
  };
}

/** Puts the original source back in place of placeholders (in code, URLs and titles). */
function restore(text: string, formulas: readonly MarkdownFormula[]): string {
  return text.replace(placeholderPattern, (match, inline?: string, block?: string) => {
    const formula = formulas[Number(inline ?? block)];
    return formula ? formula.raw : match;
  });
}

/** Splits a text value into text and maths nodes. `canBlock` lets `$$` formulas be blocks. */
function splitText(
  value: string,
  formulas: readonly MarkdownFormula[],
  canBlock: boolean,
): MdNode[] {
  const nodes: MdNode[] = [];
  let last = 0;
  for (const match of value.matchAll(placeholderPattern)) {
    const formula = formulas[Number(match[1] ?? match[2])];
    if (!formula) {
      continue;
    }
    if (match.index > last) {
      nodes.push({ type: 'text', value: value.slice(last, match.index) });
    }
    const isBlock = match[2] !== undefined && canBlock;
    nodes.push(mathNode(formula, isBlock ? 'block' : 'inline'));
    last = match.index + match[0].length;
  }
  if (last < value.length) {
    nodes.push({ type: 'text', value: value.slice(last) });
  }
  return nodes;
}

function transform(node: MdNode, formulas: readonly MarkdownFormula[]): void {
  if (typeof node.url === 'string') {
    node.url = restore(node.url, formulas);
  }
  if (typeof node.title === 'string') {
    node.title = restore(node.title, formulas);
  }
  if (typeof node.alt === 'string') {
    node.alt = restore(node.alt, formulas);
  }
  if (!node.children) {
    if (node.type !== 'text' && typeof node.value === 'string') {
      // Code, inline code and raw HTML (shown as text) keep the source as written.
      node.value = restore(node.value, formulas);
    }
    return;
  }
  const children: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      children.push(...splitText(child.value, formulas, node.type === 'paragraph'));
    } else {
      transform(child, formulas);
      children.push(child);
    }
  }
  node.children = children;
  // Block formulas leave their paragraph: [text, block, text] becomes paragraph, block, paragraph.
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (child?.type !== 'paragraph' || !child.children?.some((item) => item.type === 'math')) {
      continue;
    }
    const parts: MdNode[] = [];
    let run: MdNode[] = [];
    const endRun = () => {
      const trimmed = trimRun(run);
      if (trimmed.length > 0) {
        parts.push({ type: 'paragraph', children: trimmed });
      }
      run = [];
    };
    for (const item of child.children) {
      if (item.type === 'math') {
        endRun();
        parts.push(item);
      } else {
        run.push(item);
      }
    }
    endRun();
    node.children.splice(index, 1, ...parts);
    index += parts.length - 1;
  }
}

/** Drops the line breaks and spaces left at a paragraph part's edges, and empty text. */
function trimRun(run: readonly MdNode[]): MdNode[] {
  const nodes = run.map((node) => ({ ...node }));
  while (nodes[0]?.type === 'break') {
    nodes.shift();
  }
  while (nodes[nodes.length - 1]?.type === 'break') {
    nodes.pop();
  }
  const first = nodes[0];
  if (first?.type === 'text') {
    first.value = (first.value ?? '').replace(/^\s+/, '');
  }
  const last = nodes[nodes.length - 1];
  if (last?.type === 'text') {
    last.value = (last.value ?? '').replace(/\s+$/, '');
  }
  return nodes.filter((node) => !(node.type === 'text' && node.value === ''));
}

/** The remark plugin: placeholders from `extractMath` become `inlineMath` and `math` nodes. */
export function remarkMath(options: { formulas: readonly MarkdownFormula[] }) {
  return (tree: MdNode) => {
    if (options.formulas.length > 0) {
      transform(tree, options.formulas);
    }
  };
}
