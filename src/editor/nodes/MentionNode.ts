// An @-mention: a text entity holding the person's id and showing "@label". It's edited as one unit (Backspace
// removes it whole). HTML keeps the id (`<span data-mention-id>`); Markdown has no mention syntax, so it writes the
// plain "@label" and the id is lost there.
import {
  $applyNodeReplacement,
  TextNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from 'lexical';

export type SerializedMentionNode = Spread<{ mentionId: string }, SerializedTextNode>;

export class MentionNode extends TextNode {
  __mentionId: string;

  static override getType(): string {
    return 'mention';
  }

  static override clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__mentionId, node.__text, node.__key);
  }

  static override importJSON(json: Record<string, unknown>): MentionNode {
    const node = $applyNodeReplacement(
      new MentionNode(
        typeof json.mentionId === 'string' ? json.mentionId : '',
        typeof json.text === 'string' ? json.text : '',
      ),
    );
    return node.updateFromJSON(json).setMode('segmented');
  }

  static override importDOM(): DOMConversionMap | null {
    return {
      span: (element: HTMLElement) =>
        element.hasAttribute('data-mention-id')
          ? {
              conversion: (span: HTMLElement) => ({
                node: $createMentionNode(
                  span.getAttribute('data-mention-id') ?? '',
                  span.textContent.replace(/^@/, ''),
                ),
              }),
              priority: 1,
            }
          : null,
    };
  }

  constructor(mentionId: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__mentionId = mentionId;
  }

  override exportJSON(): SerializedMentionNode {
    return { ...super.exportJSON(), type: 'mention', mentionId: this.__mentionId };
  }

  getMentionId(): string {
    return this.getLatest().__mentionId;
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    const className: unknown = config.theme.mention;
    if (typeof className === 'string') {
      element.className = className;
    }
    element.setAttribute('data-mention-id', this.__mentionId);
    return element;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-mention-id', this.__mentionId);
    element.textContent = this.getTextContent();
    return { element };
  }

  override isTextEntity(): true {
    return true;
  }

  override canInsertTextBefore(): false {
    return false;
  }

  override canInsertTextAfter(): false {
    return false;
  }
}

/** A mention of `label` (shown as "@label"). */
export function $createMentionNode(mentionId: string, label: string): MentionNode {
  const node = new MentionNode(mentionId, `@${label}`);
  node.setMode('segmented').toggleDirectionless();
  return $applyNodeReplacement(node);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode;
}
