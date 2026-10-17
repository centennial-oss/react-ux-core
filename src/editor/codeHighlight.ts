// Syntax colours for code blocks, from `/code`'s tokenizer (the same colours as CodeBlock). Whenever a code block's
// text changes, its children are rebuilt as highlight tokens, line breaks and tabs; only the part that differs is
// replaced, and the caret keeps its place in the text.
import { $createCodeHighlightNode, $isCodeNode, CodeHighlightNode, CodeNode } from '@lexical/code';
import { mergeRegister } from '@lexical/utils';
import {
  $createLineBreakNode,
  $createTabNode,
  $getNodeByKey,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  TextNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical';
import { highlightCode, type CodeLanguage } from '../code/tokenize';

const languageAliases: Record<string, CodeLanguage> = {
  json: 'json',
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
  mjs: 'javascript',
  go: 'go',
  golang: 'go',
  python: 'python',
  py: 'python',
  sql: 'sql',
};

/** The tokenizer language for a code block's language name (unknown names get no colours). */
export function codeLanguageFor(name: string | null | undefined): CodeLanguage {
  return languageAliases[(name ?? '').toLowerCase()] ?? 'text';
}

/** The nodes a code block's text should consist of. */
function $highlightNodes(text: string, language: CodeLanguage): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  highlightCode(text, language).forEach((line, index) => {
    if (index > 0) {
      nodes.push($createLineBreakNode());
    }
    for (const token of line) {
      // Tabs are their own nodes, as Lexical's code indentation expects.
      token.text.split(/(\t)/).forEach((part) => {
        if (part === '\t') {
          nodes.push($createTabNode());
        } else if (part !== '') {
          nodes.push(
            $createCodeHighlightNode(part, token.type === 'plain' ? undefined : token.type),
          );
        }
      });
    }
  });
  return nodes;
}

function isSameNode(current: LexicalNode, next: LexicalNode): boolean {
  if ($isLineBreakNode(current) && $isLineBreakNode(next)) {
    return true;
  }
  if ($isTabNode(current) && $isTabNode(next)) {
    return true;
  }
  return (
    current instanceof CodeHighlightNode &&
    next instanceof CodeHighlightNode &&
    current.getTextContent() === next.getTextContent() &&
    current.getHighlightType() === next.getHighlightType()
  );
}

/** The caret's offset in the code block's text, when the caret is inside it. */
function $caretOffset(code: CodeNode): number | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }
  const { anchor } = selection;
  const anchorNode = anchor.getNode();
  if (anchorNode.is(code)) {
    return code
      .getChildren()
      .slice(0, anchor.offset)
      .reduce((sum, child) => sum + child.getTextContentSize(), 0);
  }
  if (!anchorNode.getParent()?.is(code)) {
    return null;
  }
  return (
    anchorNode.getPreviousSiblings().reduce((sum, child) => sum + child.getTextContentSize(), 0) +
    (anchor.type === 'text' ? anchor.offset : 0)
  );
}

function $restoreCaret(code: CodeNode, offset: number): void {
  let remaining = offset;
  const children = code.getChildren();
  for (const [index, child] of children.entries()) {
    const size = child.getTextContentSize();
    if ($isTextNode(child) && remaining <= size) {
      child.select(remaining, remaining);
      return;
    }
    if (!$isTextNode(child) && remaining === 0) {
      code.select(index, index);
      return;
    }
    remaining -= size;
  }
  code.selectEnd();
}

function $highlight(key: NodeKey): void {
  const code = $getNodeByKey(key);
  if (!$isCodeNode(code) || !code.isAttached()) {
    return;
  }
  const next = $highlightNodes(code.getTextContent(), codeLanguageFor(code.getLanguage()));
  const current = code.getChildren();
  const matches = (a: LexicalNode | undefined, b: LexicalNode | undefined) =>
    a !== undefined && b !== undefined && isSameNode(a, b);
  let start = 0;
  while (matches(current[start], next[start])) {
    start++;
  }
  let endCurrent = current.length;
  let endNext = next.length;
  while (
    endCurrent > start &&
    endNext > start &&
    matches(current[endCurrent - 1], next[endNext - 1])
  ) {
    endCurrent--;
    endNext--;
  }
  if (start === endCurrent && start === endNext) {
    return;
  }
  const caret = $caretOffset(code);
  code.splice(start, endCurrent - start, next.slice(start, endNext));
  if (caret !== null) {
    $restoreCaret(code, caret);
  }
}

/** Keeps every code block's syntax colours up to date. Returns the cleanup function. */
export function registerCodeHighlighting(editor: LexicalEditor): () => void {
  if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    return mergeRegister();
  }
  const highlightParent = (node: TextNode) => {
    const parent = node.getParent();
    if ($isCodeNode(parent)) {
      $highlight(parent.getKey());
    }
  };
  return mergeRegister(
    editor.registerNodeTransform(CodeNode, (node) => {
      $highlight(node.getKey());
    }),
    editor.registerNodeTransform(TextNode, highlightParent),
    editor.registerNodeTransform(CodeHighlightNode, highlightParent),
  );
}
