// The Lexical node classes an editor registers for its features. A node that isn't registered can't be created, so
// this is the hard limit on what a document may hold.
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import type { Klass, LexicalNode } from 'lexical';
import type { EditorFeatureSet } from './features';
import { DividerNode } from './nodes/DividerNode';
import { ImageNode } from './nodes/ImageNode';
import { MentionNode } from './nodes/MentionNode';

/** The node classes for `features`. Mentions always load, so stored mentions show even without a loader. */
export function nodesForFeatures(features: EditorFeatureSet): Klass<LexicalNode>[] {
  const nodes: Klass<LexicalNode>[] = [MentionNode];
  if (features.has('heading')) {
    nodes.push(HeadingNode);
  }
  if (features.has('quote')) {
    nodes.push(QuoteNode);
  }
  if (features.has('list') || features.has('checklist')) {
    nodes.push(ListNode, ListItemNode);
  }
  if (features.has('codeBlock')) {
    nodes.push(CodeNode, CodeHighlightNode);
  }
  if (features.has('link')) {
    nodes.push(LinkNode);
  }
  if (features.has('image')) {
    nodes.push(ImageNode);
  }
  if (features.has('table')) {
    nodes.push(TableNode, TableRowNode, TableCellNode);
  }
  if (features.has('divider')) {
    nodes.push(DividerNode);
  }
  return nodes;
}
