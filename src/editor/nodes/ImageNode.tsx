// An image in the document: an inline decorator holding a source and its (required) alt text. It serialises to
// `<img src alt>` in HTML, `![alt](src)` in Markdown and `{ type: 'image', src, altText }` in JSON.
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $applyNodeReplacement,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  createCommand,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalCommand,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type SerializedImageNode = Spread<{ src: string; altText: string }, SerializedLexicalNode>;

/** Asks the editor to edit an image's alt text (the payload is the image node's key). */
export const EDIT_IMAGE_COMMAND: LexicalCommand<NodeKey> = createCommand('CCUX_EDIT_IMAGE');

export class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __alt: string;

  static override getType(): string {
    return 'image';
  }

  static override clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  static override importJSON(json: Record<string, unknown>): ImageNode {
    return $createImageNode({
      src: typeof json.src === 'string' ? json.src : '',
      alt: typeof json.altText === 'string' ? json.altText : '',
    });
  }

  static override importDOM(): DOMConversionMap {
    return {
      img: () => ({
        conversion: (element) => ({
          node: $createImageNode({
            src: element.getAttribute('src') ?? '',
            alt: element.getAttribute('alt') ?? '',
          }),
        }),
        priority: 0,
      }),
    };
  }

  constructor(src: string, alt: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  override exportJSON(): SerializedImageNode {
    return { type: 'image', version: 1, src: this.__src, altText: this.__alt };
  }

  override exportDOM(): DOMExportOutput {
    const image = document.createElement('img');
    image.setAttribute('src', this.__src);
    image.setAttribute('alt', this.__alt);
    return { element: image };
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const className: unknown = config.theme.image;
    if (typeof className === 'string') {
      span.className = className;
    }
    return span;
  }

  override updateDOM(): false {
    return false;
  }

  override isInline(): true {
    return true;
  }

  getSrc(): string {
    return this.getLatest().__src;
  }

  getAlt(): string {
    return this.getLatest().__alt;
  }

  setAlt(alt: string): this {
    const writable = this.getWritable();
    writable.__alt = alt;
    return writable;
  }

  override decorate(): ReactNode {
    return <ImageView nodeKey={this.getKey()} src={this.__src} alt={this.__alt} />;
  }
}

export function $createImageNode({ src, alt }: { src: string; alt: string }): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

/** The image as the editor shows it: click to select, Delete or Backspace to remove, Enter to edit its alt text. */
function ImageView({ nodeKey, src, alt }: { nodeKey: NodeKey; src: string; alt: string }) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const removeIfSelected = (event: KeyboardEvent) => {
      if (!isSelected || !$isNodeSelection($getSelection())) {
        return false;
      }
      event.preventDefault();
      $getNodeByKey(nodeKey)?.remove();
      return true;
    };
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          if (event.target !== imageRef.current) {
            return false;
          }
          if (!event.shiftKey) {
            clearSelection();
          }
          setSelected(true);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, removeIfSelected, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, removeIfSelected, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!isSelected || !$isNodeSelection($getSelection())) {
            return false;
          }
          event?.preventDefault();
          editor.dispatchCommand(EDIT_IMAGE_COMMAND, nodeKey);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, isSelected, nodeKey, setSelected, clearSelection]);

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      draggable={false}
      onDoubleClick={() => editor.dispatchCommand(EDIT_IMAGE_COMMAND, nodeKey)}
      className={cn(
        'inline-block max-w-full cursor-default rounded-control align-bottom',
        isSelected && 'outline-2 outline-offset-2 outline-accent-solid',
      )}
    />
  );
}
