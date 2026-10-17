// Reading and writing the RichTextEditor's value in its three formats. Run the `$` functions inside an editor
// update (import) or read (export).
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type Transformer,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';
import type { EditorFeatureSet, EditorFormat } from './features';
import { prepareForLexical, sanitizeHtml, serializeHtml } from './sanitize';

/** What the import and export functions need to know about an editor. */
export interface EditorCodec {
  format: EditorFormat;
  features: EditorFeatureSet;
  transformers: Transformer[];
}

function isBlockNode(node: LexicalNode): boolean {
  return ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline();
}

/** Appends nodes to the root, wrapping loose inline nodes in paragraphs. */
function $appendToRoot(nodes: LexicalNode[]): void {
  const root = $getRoot();
  let paragraph: ParagraphNode | null = null;
  for (const node of nodes) {
    if (isBlockNode(node)) {
      paragraph = null;
      root.append(node);
    } else {
      if (paragraph === null) {
        paragraph = $createParagraphNode();
        root.append(paragraph);
      }
      paragraph.append(node);
    }
  }
}

/** Generates nodes from HTML after sanitising it to the editor's features. */
export function $nodesFromHtml(
  editor: LexicalEditor,
  html: string,
  features: EditorFeatureSet,
): LexicalNode[] {
  return $generateNodesFromDOM(editor, prepareForLexical(sanitizeHtml(html, features)));
}

/** Replaces the document with `value` (Markdown or HTML; JSON is set with `parseEditorState` instead). */
export function $importValue(editor: LexicalEditor, value: string, codec: EditorCodec): void {
  const root = $getRoot();
  root.clear();
  if (codec.format === 'markdown') {
    $convertFromMarkdownString(value, codec.transformers);
  } else if (codec.format === 'html') {
    $appendToRoot($nodesFromHtml(editor, value, codec.features));
  }
  if (root.getChildrenSize() === 0) {
    root.append($createParagraphNode());
  }
}

/** Sorts object keys recursively, so JSON output doesn't depend on property order. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, sortKeys(entry)]),
    );
  }
  return value;
}

/** Whether the document holds nothing but an empty paragraph. */
export function $isDocumentEmpty(): boolean {
  const root = $getRoot();
  const first = root.getFirstChild();
  return (
    root.getChildrenSize() === 0 ||
    (root.getChildrenSize() === 1 &&
      $isElementNode(first) &&
      first.getType() === 'paragraph' &&
      first.getChildrenSize() === 0)
  );
}

/** The document as the editor's format: deterministic, so the same document always gives the same string. */
export function $exportValue(editor: LexicalEditor, codec: EditorCodec): string {
  if (codec.format === 'json') {
    return JSON.stringify(sortKeys(editor.getEditorState().toJSON()), null, 2);
  }
  if ($isDocumentEmpty()) {
    return '';
  }
  if (codec.format === 'markdown') {
    return $convertToMarkdownString(codec.transformers).replace(/\s+$/, '');
  }
  return serializeHtml(sanitizeHtml($generateHtmlFromNodes(editor, null), codec.features));
}
