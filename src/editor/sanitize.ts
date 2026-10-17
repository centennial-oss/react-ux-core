// HTML in and out of the RichTextEditor. Everything that enters (a stored value, a paste from Google Docs or a web
// page) is rebuilt from scratch with only the elements and formatting the editor's features allow: scripts, styles,
// unknown tags and every attribute but a few (href, src, alt, a code block's language, a checklist's state) are
// dropped, and formatting that Google Docs expresses as inline styles (`font-weight:700`, `font-style:italic`…)
// becomes the matching element first. The same cleaner runs on the way out, then a serialiser writes canonical HTML
// (one top-level block per line, list items and table rows on their own lines, sorted attributes), so the stored
// value is deterministic and diffs stay small.
import type { EditorFeatureSet } from './features';

/** Removed along with everything inside them. */
const DROPPED = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'svg',
  'math',
  'canvas',
  'video',
  'audio',
  'picture',
  'source',
  'track',
  'map',
  'form',
  'input',
  'button',
  'select',
  'option',
  'textarea',
  'head',
  'title',
  'meta',
  'link',
  'base',
  'colgroup',
  'col',
  'caption',
  'dialog',
]);

/** Inline elements that are unwrapped (their text kept, the element dropped). */
const UNWRAPPED_INLINE = new Set([
  'span',
  'font',
  'small',
  'big',
  'sub',
  'sup',
  'mark',
  'abbr',
  'acronym',
  'cite',
  'q',
  'dfn',
  'var',
  'time',
  'label',
  'bdi',
  'bdo',
  'data',
  'nobr',
]);

/** Elements whose output is a block. */
const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input']);

const MONOSPACE =
  /\b(?:monospace|courier|consolas|menlo|monaco|roboto mono|source code pro|fira code)\b/i;

interface Marks {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isCode: boolean;
}

const noMarks: Marks = {
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrike: false,
  isCode: false,
};

interface Context {
  doc: Document;
  features: EditorFeatureSet;
  marks: Marks;
  /** Inside a link, an underline from inline styles is the link's own look, not formatting. */
  isInLink: boolean;
}

/** A link target that's safe to keep: web, mail and phone links, and relative URLs. */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === '') {
    return false;
  }
  if (/^(?:https?:|mailto:|tel:)/i.test(trimmed)) {
    return true;
  }
  // Relative: no scheme before the first slash, question mark or hash.
  return !/^[a-z][a-z\d+.-]*:/i.test(trimmed);
}

/** An image source that's safe to keep: web and relative URLs, blob URLs and raster or SVG data URLs. */
export function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  return (
    /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/i.test(trimmed) ||
    /^blob:/i.test(trimmed) ||
    (isSafeUrl(trimmed) && !/^(?:mailto|tel):/i.test(trimmed))
  );
}

/** Applies a tag's meaning and its inline styles (how Google Docs marks formatting) to the current marks. */
function marksFor(element: HTMLElement, tag: string, marks: Marks, isInLink: boolean): Marks {
  const next = { ...marks };
  if (tag === 'b' || tag === 'strong') {
    next.isBold = true;
  } else if (tag === 'i' || tag === 'em') {
    next.isItalic = true;
  } else if (tag === 'u' || tag === 'ins') {
    next.isUnderline = true;
  } else if (tag === 's' || tag === 'strike' || tag === 'del') {
    next.isStrike = true;
  } else if (tag === 'code' || tag === 'kbd' || tag === 'samp' || tag === 'tt') {
    next.isCode = true;
  }
  const { style } = element;
  const weight = style.fontWeight;
  if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) {
    next.isBold = true;
  } else if (
    weight === 'normal' ||
    weight === 'lighter' ||
    (weight !== '' && Number(weight) < 600)
  ) {
    // Google Docs wraps a paste in <b style="font-weight:normal">, and un-bolds headings this way.
    next.isBold = false;
  }
  if (style.fontStyle === 'italic' || style.fontStyle === 'oblique') {
    next.isItalic = true;
  } else if (style.fontStyle === 'normal') {
    next.isItalic = false;
  }
  const decoration = `${style.textDecorationLine} ${style.textDecoration}`;
  if (decoration.includes('underline') && !isInLink) {
    next.isUnderline = true;
  }
  if (decoration.includes('line-through')) {
    next.isStrike = true;
  }
  if (MONOSPACE.test(style.fontFamily)) {
    next.isCode = true;
  }
  return next;
}

/** Wraps a text node in the marks the features allow, in a fixed nesting order. */
function wrapText(text: string, context: Context): Node {
  const { doc, features, marks } = context;
  let node: Node = doc.createTextNode(text);
  const wrap = (tag: string) => {
    const element = doc.createElement(tag);
    element.append(node);
    node = element;
  };
  if (marks.isCode && features.has('code')) {
    wrap('code');
  }
  if (marks.isStrike && features.has('strike')) {
    wrap('s');
  }
  if (marks.isUnderline && features.has('underline')) {
    wrap('u');
  }
  if (marks.isItalic && features.has('italic')) {
    wrap('em');
  }
  if (marks.isBold && features.has('bold')) {
    wrap('strong');
  }
  return node;
}

function isBlock(node: Node): boolean {
  return node instanceof Element && BLOCK_TAGS.has(node.tagName.toLowerCase());
}

function isBlank(node: Node): boolean {
  return (
    (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() === '') ||
    (node instanceof Element && node.tagName === 'BR')
  );
}

function create(context: Context, tag: string, children: Node[] = []): HTMLElement {
  const element = context.doc.createElement(tag);
  element.append(...children);
  return element;
}

/** Trims the whitespace at the edges of a run of inline nodes. */
function trimInline(nodes: Node[]): Node[] {
  const result = [...nodes];
  const trimEdge = (node: Node | undefined, side: 'start' | 'end'): void => {
    if (node === undefined) {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = (node.textContent ?? '')[side === 'start' ? 'trimStart' : 'trimEnd']();
    } else if (node instanceof Element && node.tagName !== 'BR') {
      trimEdge(
        side === 'start' ? (node.firstChild ?? undefined) : (node.lastChild ?? undefined),
        side,
      );
    }
  };
  trimEdge(result[0], 'start');
  trimEdge(result.at(-1), 'end');
  while (result.length > 0 && result.at(-1)?.nodeName === 'BR') {
    result.pop();
  }
  return result.filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent !== '');
}

/** Groups loose inline nodes into paragraphs, keeping blocks as they are. Blank runs are dropped. */
function blockify(nodes: Node[], context: Context): Node[] {
  const result: Node[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.some((node) => !isBlank(node))) {
      result.push(create(context, 'p', trimInline(run)));
    }
    run = [];
  };
  for (const node of nodes) {
    if (isBlock(node)) {
      flush();
      result.push(node);
    } else {
      run.push(node);
    }
  }
  flush();
  return result;
}

/** Flattens blocks into inline content, separating them with line breaks (for quotes and list items). */
function inlineOnly(nodes: Node[], context: Context, keepLists = false): Node[] {
  const result: Node[] = [];
  const pushBreak = () => {
    if (result.length > 0 && result.at(-1)?.nodeName !== 'BR') {
      result.push(create(context, 'br'));
    }
  };
  for (const node of nodes) {
    if (!isBlock(node)) {
      result.push(node);
      continue;
    }
    const tag = node.nodeName.toLowerCase();
    if (keepLists && (tag === 'ul' || tag === 'ol')) {
      result.push(node);
    } else if (tag !== 'hr') {
      pushBreak();
      result.push(...inlineOnly(Array.from(node.childNodes), context, keepLists));
      pushBreak();
    }
  }
  return trimInline(result);
}

function cleanChildren(parent: Node, context: Context): Node[] {
  return Array.from(parent.childNodes).flatMap((child) => cleanNode(child, context));
}

/** The text of a code block, with line breaks as newlines. */
function preText(element: Element): string {
  let text = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    } else if (node instanceof Element) {
      if (node.tagName === 'BR') {
        text += '\n';
      } else if (!DROPPED.has(node.tagName.toLowerCase())) {
        node.childNodes.forEach(walk);
        // Lines as block elements (GitHub, some IDEs).
        if ((node.tagName === 'DIV' || node.tagName === 'P') && node.nextSibling !== null) {
          text += '\n';
        }
      }
    }
  };
  element.childNodes.forEach(walk);
  return text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
}

function codeLanguage(element: Element): string {
  const fromAttribute =
    element.getAttribute('data-language') ?? element.getAttribute('data-highlight-language');
  if (fromAttribute !== null && /^[\w+#.-]{1,32}$/.test(fromAttribute)) {
    return fromAttribute.toLowerCase();
  }
  const code = element.tagName === 'CODE' ? element : element.querySelector('code');
  const match = /(?:^|\s)(?:language|lang)-([\w+#.-]{1,32})/.exec(
    code?.getAttribute('class') ?? '',
  );
  return match?.[1]?.toLowerCase() ?? '';
}

function cleanCodeBlock(element: Element, context: Context): Node[] {
  const text = preText(element);
  if (!context.features.has('codeBlock')) {
    const lines = text.split('\n');
    return [
      create(
        context,
        'p',
        lines.flatMap((line, index) => [
          ...(index > 0 ? [create(context, 'br')] : []),
          context.doc.createTextNode(line),
        ]),
      ),
    ];
  }
  const code = create(context, 'code', [context.doc.createTextNode(text)]);
  const language = codeLanguage(element);
  if (language !== '') {
    code.setAttribute('class', `language-${language}`);
  }
  return [create(context, 'pre', [code])];
}

function isChecklist(list: Element): boolean {
  return (
    list.getAttribute('__lexicallisttype') === 'check' ||
    list.classList.contains('contains-task-list') ||
    list.getAttribute('data-is-checklist') === '1' ||
    Array.from(list.children).some(
      (item) =>
        item.hasAttribute('aria-checked') ||
        item.classList.contains('task-list-item') ||
        item.querySelector(':scope > input[type="checkbox"]') !== null,
    )
  );
}

function isChecked(item: Element): boolean {
  return (
    item.getAttribute('aria-checked') === 'true' ||
    item.querySelector(
      ':scope > input[type="checkbox"][checked], :scope > p > input[type="checkbox"][checked]',
    ) !== null
  );
}

function cleanList(list: Element, context: Context): Node[] {
  const { features } = context;
  const isCheck = isChecklist(list) && features.has('checklist');
  const isAllowed = isCheck || features.has('list');
  const ordered = list.tagName === 'OL' && !isCheck;
  const items: Element[] = [];
  for (const child of Array.from(list.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'li') {
      items.push(child);
    } else if ((tag === 'ul' || tag === 'ol') && items.length > 0) {
      // A nested list placed directly in its parent list belongs to the item before it.
      items.at(-1)?.append(child.cloneNode(true));
    }
  }
  if (!isAllowed) {
    return items.flatMap((item) => blockify(cleanChildren(item, context), context));
  }
  const output = create(context, isCheck ? 'ul' : ordered ? 'ol' : 'ul');
  if (isCheck) {
    output.setAttribute('class', 'contains-task-list');
  }
  for (const item of items) {
    const content = inlineOnly(cleanChildren(item, context), context, true);
    const li = create(context, 'li');
    if (isCheck) {
      li.setAttribute('class', 'task-list-item');
      const box = create(context, 'input');
      box.setAttribute('type', 'checkbox');
      box.setAttribute('disabled', '');
      if (isChecked(item)) {
        box.setAttribute('checked', '');
      }
      li.append(box);
    }
    li.append(...content);
    output.append(li);
  }
  return output.childNodes.length > 0 ? [output] : [];
}

function cleanTable(table: Element, context: Context): Node[] {
  const rows = Array.from(table.querySelectorAll('tr')).filter(
    (row) => row.closest('table') === table,
  );
  if (!context.features.has('table')) {
    return rows.flatMap((row) =>
      Array.from(row.children).flatMap((cell) => blockify(cleanChildren(cell, context), context)),
    );
  }
  const cleanRows = rows
    .map((row) => {
      const tr = create(context, 'tr');
      for (const cell of Array.from(row.children)) {
        const tag = cell.tagName.toLowerCase();
        if (tag === 'td' || tag === 'th') {
          tr.append(create(context, tag, blockify(cleanChildren(cell, context), context)));
        }
      }
      return tr;
    })
    .filter((row) => row.childNodes.length > 0);
  if (cleanRows.length === 0) {
    return [];
  }
  const output = create(context, 'table');
  const [first, ...rest] = cleanRows;
  if (first !== undefined && Array.from(first.children).every((cell) => cell.tagName === 'TH')) {
    output.append(create(context, 'thead', [first]));
    if (rest.length > 0) {
      output.append(create(context, 'tbody', rest));
    }
  } else {
    output.append(create(context, 'tbody', cleanRows));
  }
  return [output];
}

function cleanElement(element: HTMLElement, context: Context): Node[] {
  const tag = element.tagName.toLowerCase();
  const { features } = context;
  if (DROPPED.has(tag)) {
    return [];
  }
  const marks = marksFor(element, tag, context.marks, context.isInLink || tag === 'a');
  const inner: Context = { ...context, marks, isInLink: context.isInLink || tag === 'a' };

  switch (tag) {
    case 'br':
      return [create(context, 'br')];
    case 'b':
    case 'strong':
    case 'i':
    case 'em':
    case 'u':
    case 'ins':
    case 's':
    case 'strike':
    case 'del':
    case 'kbd':
    case 'samp':
    case 'tt':
      return cleanChildren(element, inner);
    case 'code':
      // Multi-line code outside a <pre> is a code block, as Lexical reads it.
      return element.textContent.includes('\n') || element.querySelector('br') !== null
        ? cleanCodeBlock(element, context)
        : cleanChildren(element, inner);
    case 'a': {
      const children = cleanChildren(element, inner);
      const href = element.getAttribute('href') ?? '';
      if (!features.has('link') || !isSafeUrl(href) || children.some(isBlock)) {
        return children;
      }
      const link = create(context, 'a', children);
      link.setAttribute('href', href.trim());
      return [link];
    }
    case 'img': {
      const src = element.getAttribute('src') ?? '';
      if (!features.has('image') || !isSafeImageSrc(src)) {
        return [];
      }
      const image = create(context, 'img');
      image.setAttribute('src', src.trim());
      image.setAttribute('alt', (element.getAttribute('alt') ?? '').replace(/\s+/g, ' ').trim());
      return [image];
    }
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const content = inlineOnly(cleanChildren(element, inner), context);
      if (content.length === 0) {
        return [];
      }
      return [create(context, features.has('heading') ? tag : 'p', content)];
    }
    case 'blockquote': {
      const children = cleanChildren(element, inner);
      if (!features.has('quote')) {
        return blockify(children, context);
      }
      const content = inlineOnly(children, context);
      return content.length > 0 ? [create(context, 'blockquote', content)] : [];
    }
    case 'ul':
    case 'ol':
      return cleanList(element, context);
    case 'pre':
    case 'xmp':
    case 'listing':
      return cleanCodeBlock(element, context);
    case 'table':
      return cleanTable(element, context);
    case 'hr':
      return features.has('divider') ? [create(context, 'hr')] : [];
    case 'span':
      if (element.hasAttribute('data-mention-id') && features.has('mention')) {
        const mention = create(context, 'span', [context.doc.createTextNode(element.textContent)]);
        mention.setAttribute('data-mention-id', element.getAttribute('data-mention-id') ?? '');
        return [mention];
      }
      return cleanChildren(element, inner);
    default:
      if (UNWRAPPED_INLINE.has(tag)) {
        return cleanChildren(element, inner);
      }
      // p, div, li outside a list, section, figure and every other unknown element: a block of its content.
      return blockify(cleanChildren(element, inner), context);
  }
}

function cleanNode(node: Node, context: Context): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    // Collapse source whitespace the way a browser renders it.
    const text = (node.textContent ?? '').replace(/[\t\n\r\f ]+/g, ' ');
    return text === '' ? [] : [wrapText(text, context)];
  }
  if (node instanceof HTMLElement) {
    return cleanElement(node, context);
  }
  return [];
}

/** Rebuilds `html` with only what `features` allow, as the children of a new `<body>`. */
export function sanitizeHtml(html: string, features: EditorFeatureSet): HTMLElement {
  const source = new DOMParser().parseFromString(html, 'text/html');
  const output = document.implementation.createHTMLDocument('');
  const context: Context = { doc: output, features, marks: noMarks, isInLink: false };
  output.body.append(...blockify(cleanChildren(source.body, context), context));
  return output.body;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u00a0/g, '&nbsp;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}

const LINE_BEFORE = new Set(['li', 'tr', 'thead', 'tbody']);
const LINE_BEFORE_CLOSE = new Set(['ul', 'ol', 'table', 'thead', 'tbody']);

function serializeNode(node: Node, isInPre: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(node.textContent ?? '');
  }
  if (!(node instanceof Element)) {
    return '';
  }
  const tag = node.tagName.toLowerCase();
  const attributes = Array.from(node.attributes)
    .map((attribute) => [attribute.name, attribute.value] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`))
    .join('');
  const open = `${LINE_BEFORE.has(tag) && !isInPre ? '\n' : ''}<${tag}${attributes}>`;
  if (VOID_TAGS.has(tag)) {
    return open;
  }
  const inner = Array.from(node.childNodes)
    .map((child) => serializeNode(child, isInPre || tag === 'pre'))
    .join('');
  return `${open}${inner}${LINE_BEFORE_CLOSE.has(tag) ? '\n' : ''}</${tag}>`;
}

/** Canonical HTML for sanitised content: one top-level block per line, attributes sorted. */
export function serializeHtml(body: HTMLElement): string {
  return Array.from(body.childNodes)
    .map((node) => serializeNode(node, false))
    .join('\n');
}

/** Sanitises and serialises in one step. */
export function cleanHtml(html: string, features: EditorFeatureSet): string {
  return serializeHtml(sanitizeHtml(html, features));
}

/**
 * Turns sanitised HTML into the shape Lexical's importer reads most reliably: a code block's language moves to
 * `data-language` on the `<pre>`, and its lines become text separated by `<br>`; GitHub-style checklist inputs are
 * removed (the item keeps its state as `aria-checked`).
 */
export function prepareForLexical(body: HTMLElement): Document {
  const doc = body.ownerDocument;
  for (const pre of Array.from(body.querySelectorAll('pre'))) {
    const language = codeLanguage(pre);
    const lines = pre.textContent.split('\n');
    pre.replaceChildren(
      ...lines.flatMap((line, index) => [
        ...(index > 0 ? [doc.createElement('br')] : []),
        doc.createTextNode(line),
      ]),
    );
    if (language !== '') {
      pre.setAttribute('data-language', language);
    }
  }
  for (const list of Array.from(body.querySelectorAll('ul.contains-task-list'))) {
    list.setAttribute('__lexicallisttype', 'check');
    list.removeAttribute('class');
    for (const item of Array.from(list.children)) {
      const box = item.querySelector(':scope > input[type="checkbox"]');
      item.setAttribute('aria-checked', box?.hasAttribute('checked') === true ? 'true' : 'false');
      item.removeAttribute('class');
      box?.remove();
    }
  }
  return doc;
}
