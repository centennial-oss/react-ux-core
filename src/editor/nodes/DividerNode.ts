// A divider (horizontal rule) between blocks. Its JSON type is Lexical's own `horizontalrule`, so documents stay
// compatible with other Lexical editors; it's ours so the editor doesn't depend on Lexical's extension package.
import { $insertNodeToNearestRoot } from '@lexical/utils';
import {
  $applyNodeReplacement,
  DecoratorNode,
  createCommand,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalCommand,
  type LexicalNode,
  type SerializedLexicalNode,
} from 'lexical';

/** Inserts a divider after the block at the caret. */
export const INSERT_DIVIDER_COMMAND: LexicalCommand<void> = createCommand('CCUX_INSERT_DIVIDER');

export class DividerNode extends DecoratorNode<null> {
  static override getType(): string {
    return 'horizontalrule';
  }

  static override clone(node: DividerNode): DividerNode {
    return new DividerNode(node.__key);
  }

  static override importJSON(): DividerNode {
    return $createDividerNode();
  }

  static override importDOM(): DOMConversionMap {
    return { hr: () => ({ conversion: () => ({ node: $createDividerNode() }), priority: 0 }) };
  }

  override exportJSON(): SerializedLexicalNode {
    return { type: 'horizontalrule', version: 1 };
  }

  override exportDOM(): DOMExportOutput {
    return { element: document.createElement('hr') };
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('hr');
    const className: unknown = config.theme.hr;
    if (typeof className === 'string') {
      element.className = className;
    }
    return element;
  }

  override getTextContent(): string {
    return '\n';
  }

  override isInline(): false {
    return false;
  }

  override updateDOM(): false {
    return false;
  }

  override decorate(): null {
    return null;
  }
}

export function $createDividerNode(): DividerNode {
  return $applyNodeReplacement(new DividerNode());
}

export function $isDividerNode(node: LexicalNode | null | undefined): node is DividerNode {
  return node instanceof DividerNode;
}

/** Inserts a divider at the selection (after the current block). */
export function $insertDivider(): void {
  $insertNodeToNearestRoot($createDividerNode());
}
