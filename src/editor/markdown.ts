// Markdown for the RichTextEditor: Lexical's transformers for the features that are on, plus our own for tables
// (GFM pipe tables with a header row), images (`![alt](src)`), dividers (`---`) and mentions (written as "@label";
// Markdown has no mention syntax, so they come back as plain text). Paragraph lines that would read as another block
// (a "#", "-", "1." or ">" at the start) are escaped, so a document round-trips without changing shape.
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  CODE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  isTableRowDivider,
  type ElementTransformer,
  type MultilineElementTransformer,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import { $createParagraphNode, $isParagraphNode, type LexicalNode } from 'lexical';
import type { EditorFeatureSet } from './features';
import { $createDividerNode, $isDividerNode, DividerNode } from './nodes/DividerNode';
import { $createImageNode, $isImageNode, ImageNode } from './nodes/ImageNode';
import { $isMentionNode, MentionNode } from './nodes/MentionNode';

/** Never matches: for transformers that only export. */
const NEVER = /(?!)/;

const TABLE_ROW = /^\|(.*)\|\s*$/;
const LINE_BREAK = /<br\s*\/?>/i;

/** A table row's cells, splitting on pipes that aren't escaped. Null when the line isn't a row. */
function splitTableRow(line: string): string[] | null {
  const match = TABLE_ROW.exec(line.trim());
  if (!match) {
    return null;
  }
  const inner = match[1] ?? '';
  const cells: string[] = [];
  let current = '';
  for (let index = 0; index < inner.length; index++) {
    const char = inner.charAt(index);
    if (char === '\\' && inner.charAt(index + 1) === '|') {
      current += '\\|';
      index++;
    } else if (char === '|') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/** Escapes text so it stays inside a Markdown image's alt brackets and isn't read as formatting. */
function escapeAlt(alt: string): string {
  return alt.replace(/\s+/g, ' ').replace(/([\\[\]*_`~])/g, '\\$1');
}

function unescapeAlt(alt: string): string {
  return alt.replace(/\\(.)/g, '$1');
}

/** Keeps a URL in one Markdown token: spaces and parentheses are percent-encoded. */
function encodeUrl(url: string): string {
  return url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/** Escapes the start of each line of a paragraph that Markdown would read as a block. */
function escapeBlockStarts(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^(\s*)(#{1,6})(?=\s|$)/, '$1\\$2')
        .replace(/^(\s*)([-+])(?=\s)/, '$1\\$2')
        .replace(/^(\s*)(\d+)([.)])(?=\s|$)/, '$1$2\\$3')
        .replace(/^(\s*)([>|])/, '$1\\$2')
        .replace(/^(\s*)(-{3,})\s*$/, '$1\\$2')
        .replace(/^(\s*)(={3,})\s*$/, '$1\\$2'),
    )
    .join('\n');
}

const PARAGRAPH: ElementTransformer = {
  dependencies: [],
  export: (node, exportChildren) =>
    $isParagraphNode(node) ? escapeBlockStarts(exportChildren(node)) : null,
  regExp: NEVER,
  replace: () => false,
  type: 'element',
};

const DIVIDER: ElementTransformer = {
  dependencies: [DividerNode],
  export: (node) => ($isDividerNode(node) ? '---' : null),
  regExp: /^(?:---|\*\*\*|___)\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const line = $createDividerNode();
    if (isImport || parentNode.getNextSibling() !== null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }
    if (!isImport) {
      line.selectNext();
    }
  },
  type: 'element',
};

const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) =>
    $isImageNode(node) ? `![${escapeAlt(node.getAlt())}](${encodeUrl(node.getSrc())})` : null,
  importRegExp: /!\[((?:[^\]\\]|\\.)*)\]\(([^()\s]+)\)/,
  regExp: /!\[((?:[^\]\\]|\\.)*)\]\(([^()\s]+)\)$/,
  replace: (textNode, match) => {
    textNode.replace($createImageNode({ src: match[2] ?? '', alt: unescapeAlt(match[1] ?? '') }));
  },
  trigger: ')',
  type: 'text-match',
};

const MENTION: TextMatchTransformer = {
  dependencies: [MentionNode],
  export: (node) => ($isMentionNode(node) ? node.getTextContent() : null),
  regExp: NEVER,
  type: 'text-match',
};

/** GFM tables: a header row, a delimiter row, then body rows. Cells hold inline Markdown; `<br>` separates lines. */
function createTableTransformer(cellTransformers: Transformer[]): MultilineElementTransformer {
  const createCell = (markdown: string, headerState: number) => {
    const cell = $createTableCellNode(headerState);
    const text = markdown
      .replace(/\\\|/g, '|')
      .split(LINE_BREAK)
      .map((part) => part.trim())
      .join('\n\n');
    const nodes: LexicalNode[] =
      text === '' ? [] : $generateNodesFromMarkdownString(text, cellTransformers);
    cell.append(...(nodes.length > 0 ? nodes : [$createParagraphNode()]));
    return cell;
  };

  return {
    dependencies: [TableNode, TableRowNode, TableCellNode],
    regExpStart: TABLE_ROW,
    handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex }) => {
      const header = splitTableRow(lines[startLineIndex] ?? '');
      const delimiter = lines[startLineIndex + 1]?.trim();
      if (header === null || delimiter === undefined || !isTableRowDivider(delimiter)) {
        return null;
      }
      const rows = [header];
      let lastLine = startLineIndex + 1;
      for (let index = startLineIndex + 2; index < lines.length; index++) {
        const cells = splitTableRow(lines[index] ?? '');
        if (cells === null) {
          break;
        }
        rows.push(cells);
        lastLine = index;
      }
      const width = Math.max(...rows.map((cells) => cells.length));
      const table = $createTableNode();
      rows.forEach((cells, rowIndex) => {
        const row = $createTableRowNode();
        for (let column = 0; column < width; column++) {
          row.append(
            createCell(
              cells[column] ?? '',
              rowIndex === 0 ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS,
            ),
          );
        }
        table.append(row);
      });
      rootNode.append(table);
      return [true, lastLine];
    },
    // Tables are only read from Markdown, not typed as a shortcut.
    replace: () => false,
    export: (node) => {
      if (!$isTableNode(node)) {
        return null;
      }
      const rows = node.getChildren().filter($isTableRowNode);
      const lines = rows.map((row) => {
        const cells = row
          .getChildren()
          .filter($isTableCellNode)
          .map((cell) =>
            $convertToMarkdownString(cellTransformers, cell)
              .split(/\n+/)
              .map((part) => part.trim())
              .filter((part) => part !== '')
              .join('<br>')
              .replace(/\|/g, '\\|'),
          );
        return `| ${cells.join(' | ')} |`;
      });
      // GFM needs a header row, so the first row is always written as one.
      const columns = rows[0]?.getChildren().filter($isTableCellNode).length ?? 0;
      lines.splice(1, 0, `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`);
      return lines.join('\n');
    },
    type: 'multiline-element',
  };
}

/** The Markdown transformers for `features`, in the order Lexical needs them. */
export function createMarkdownTransformers(features: EditorFeatureSet): Transformer[] {
  const textFormats: TextFormatTransformer[] = [];
  if (features.has('code')) {
    textFormats.push(INLINE_CODE);
  }
  if (features.has('bold') && features.has('italic')) {
    textFormats.push(BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE);
  }
  if (features.has('bold')) {
    textFormats.push(BOLD_STAR, BOLD_UNDERSCORE);
  }
  if (features.has('italic')) {
    textFormats.push(ITALIC_STAR, ITALIC_UNDERSCORE);
  }
  if (features.has('strike')) {
    textFormats.push(STRIKETHROUGH);
  }

  // Images go before links: a link's pattern would otherwise take the image's "[alt](src)".
  const textMatches: TextMatchTransformer[] = [MENTION];
  if (features.has('image')) {
    textMatches.push(IMAGE);
  }
  if (features.has('link')) {
    textMatches.push(LINK);
  }

  const inline: Transformer[] = [...textFormats, ...textMatches];

  const elements: (ElementTransformer | MultilineElementTransformer)[] = [];
  if (features.has('heading')) {
    elements.push(HEADING);
  }
  if (features.has('quote')) {
    elements.push(QUOTE);
  }
  if (features.has('divider')) {
    elements.push(DIVIDER);
  }
  // A checklist line also matches the bullet pattern, so it goes first.
  if (features.has('checklist')) {
    elements.push(CHECK_LIST);
  }
  if (features.has('list')) {
    elements.push(UNORDERED_LIST, ORDERED_LIST);
  }
  if (features.has('codeBlock')) {
    elements.push(CODE);
  }
  if (features.has('table')) {
    elements.push(createTableTransformer(inline));
  }
  elements.push(PARAGRAPH);

  return [...elements, ...inline];
}

/**
 * The transformers Markdown shortcuts use while typing: the same set without the export-only and import-only ones
 * (tables, mentions, the paragraph escaper).
 */
export function shortcutTransformers(transformers: Transformer[]): Transformer[] {
  return transformers.filter(
    (transformer) =>
      transformer !== PARAGRAPH &&
      transformer !== MENTION &&
      !(transformer.type === 'multiline-element' && transformer !== CODE),
  );
}
