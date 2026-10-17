// RichTextEditor: a WYSIWYG editor (built on Lexical) for articles, notes, emails and comments. The document is
// stored as Markdown, sanitised HTML or Lexical's JSON (`format`), written deterministically so diffs stay clean.
// `features` decides the toolbar, the nodes the document may hold, the Markdown syntax read and written, and what a
// paste keeps. It sits in the standard field frame (label, description, error) like the other inputs.
//
// Keyboard: every toolbar action has a shortcut (shown in its tooltip); Markdown shortcuts work as you type ("# ",
// "- ", "1. ", "[ ] ", "> ", "**bold**", "```"); "/" opens the block menu and "@" the mention menu (Up, Down, Enter,
// Escape). With checklists, the command key and Enter ticks the item at the caret.
import { $isLinkNode } from '@lexical/link';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { $findMatchingParent } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
} from 'lexical';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type Ref,
  type RefObject,
} from 'react';
import { FieldErrorContext, LabelContext, Provider, TextContext } from 'react-aria-components';
import { FieldFrame, fieldRootClasses, type FieldBaseProps } from '../components/Field/Field';
import { cn } from '../utils/cn';
import { isActionAvailable, runAction, type EditorAction } from './actions';
import { EditorToolbar, toolbarGroups } from './EditorToolbar';
import {
  defaultEditorFeatures,
  resolveFeatures,
  type EditorFeature,
  type EditorFeatureSet,
  type EditorFormat,
} from './features';
import { ImageDialog, type EditorImageUploader, type ImageRequest } from './ImageDialog';
import { LinkPopover, type LinkTarget } from './LinkPopover';
import { createMarkdownTransformers, shortcutTransformers } from './markdown';
import { MentionsPlugin, type EditorMentionLoader } from './MentionsPlugin';
import { useEditorMessages, type EditorStrings } from './messages';
import { nodesForFeatures } from './nodes';
import { EDIT_IMAGE_COMMAND, $isImageNode } from './nodes/ImageNode';
import { EditablePlugin, loadValue, PolicyPlugin, ShortcutsPlugin, ValuePlugin } from './plugins';
import { SlashMenuPlugin } from './SlashMenuPlugin';
import { editorTheme } from './theme';
import { isSafeUrl } from './sanitize';
import type { EditorCodec } from './value';

const validDetails: ValidityState = {
  badInput: false,
  customError: false,
  patternMismatch: false,
  rangeOverflow: false,
  rangeUnderflow: false,
  stepMismatch: false,
  tooLong: false,
  tooShort: false,
  typeMismatch: false,
  valid: true,
  valueMissing: false,
};

/** The blocks the "/" menu offers, in order. */
const slashActions: readonly EditorAction[] = [
  'paragraph',
  'h1',
  'h2',
  'h3',
  'bullet',
  'number',
  'check',
  'quote',
  'codeBlock',
  'image',
  'table',
  'divider',
];

export interface RichTextEditorProps extends FieldBaseProps {
  /** The document in `format`. Controlled. */
  value?: string;
  /** The initial document, uncontrolled. */
  defaultValue?: string;
  /** Called with the document in `format` after each change. */
  onChange?: (value: string) => void;
  /**
   * How the document is stored: Markdown (GFM tables and checklists; mentions as "@label"; no underline), HTML
   * (sanitised to the features) or Lexical's JSON. Choose one per app.
   */
  format: EditorFormat;
  /** The toolbar items and the content the document may hold. Defaults to the common set (everything but `embed`). */
  features?: readonly EditorFeature[];
  /** "/" opens a menu of blocks to insert. */
  hasSlashMenu?: boolean;
  /** Stores an image file (chosen, pasted or dropped) and returns its URL. Without it, images are added by address. */
  uploadImage?: EditorImageUploader;
  /** Finds people for @-mentions (the chat Composer's signature). Mentions need it. */
  loadMentions?: EditorMentionLoader;
  /** Shown while the document is empty. */
  placeholder?: string;
  /** The editing area's least height, as a CSS length. Defaults to `10rem`. */
  minHeight?: string;
  /** The editing area's greatest height; a longer document scrolls inside it. Without it, the editor grows. */
  maxHeight?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  /** Submits the document with a form, in a hidden input. */
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

/** A WYSIWYG editor that stores Markdown, sanitised HTML or JSON. */
export function RichTextEditor({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  format,
  features = defaultEditorFeatures,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  isInvalid = false,
  className,
  ref,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: RichTextEditorProps) {
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const hasMentionLoader = rest.loadMentions !== undefined;
  // The editor's nodes and syntax are fixed when it's created, so a change of format or features makes a new one.
  // The key also keeps the resolved set stable when the app passes a new but equal `features` array.
  const editorKey = `${format}:${hasMentionLoader ? 'mentions:' : ''}${[...features].sort().join(',')}`;
  const resolved = useMemo(
    () => resolveFeatures(features, format, hasMentionLoader),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `editorKey` covers `features`, `format` and the loader.
    [editorKey],
  );

  const describedBy = [
    ariaDescribedBy,
    description !== undefined ? descriptionId : undefined,
    isInvalid && errorMessage !== undefined ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      data-invalid={isInvalid || undefined}
      data-disabled={isDisabled || undefined}
      data-readonly={isReadOnly || undefined}
      className={fieldRootClasses(className)}
    >
      <Provider
        values={[
          [LabelContext, { id: labelId, elementType: 'span' }],
          [
            TextContext,
            { slots: { description: { id: descriptionId }, errorMessage: { id: errorId } } },
          ],
          [FieldErrorContext, { isInvalid, validationErrors: [], validationDetails: validDetails }],
        ]}
      >
        <FieldFrame
          label={label}
          description={description}
          errorMessage={errorMessage}
          labelPosition={labelPosition}
          infoTip={infoTip}
          isRequired={isRequired}
        >
          <EditorInstance
            key={editorKey}
            {...rest}
            format={format}
            features={resolved}
            isRequired={isRequired}
            isDisabled={isDisabled}
            isReadOnly={isReadOnly}
            isInvalid={isInvalid}
            ariaLabel={ariaLabel}
            ariaLabelledBy={ariaLabelledBy ?? (label !== undefined ? labelId : undefined)}
            ariaDescribedBy={describedBy || undefined}
            ariaErrorMessage={isInvalid && errorMessage !== undefined ? errorId : undefined}
          />
        </FieldFrame>
      </Provider>
    </div>
  );
}

interface EditorInstanceProps extends Omit<
  RichTextEditorProps,
  | 'features'
  | 'label'
  | 'description'
  | 'errorMessage'
  | 'labelPosition'
  | 'infoTip'
  | 'className'
  | 'ref'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
> {
  features: EditorFeatureSet;
  isRequired: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaErrorMessage?: string;
}

function EditorInstance({
  value,
  defaultValue,
  onChange,
  format,
  features,
  hasSlashMenu = false,
  uploadImage,
  loadMentions,
  placeholder,
  minHeight = '10rem',
  maxHeight,
  isRequired,
  isDisabled,
  isReadOnly,
  isInvalid,
  name,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaErrorMessage,
}: EditorInstanceProps) {
  const messages = useEditorMessages();
  const codec = useMemo<EditorCodec>(
    () => ({ format, features, transformers: createMarkdownTransformers(features) }),
    [format, features],
  );
  const [initialValue] = useState(() => value ?? defaultValue ?? '');
  const lastValueRef = useRef(initialValue);
  const [currentValue, setCurrentValue] = useState(initialValue);

  const [initialConfig] = useState<InitialConfigType>(() => ({
    namespace: 'ccux-rich-text',
    nodes: nodesForFeatures(features),
    theme: editorTheme,
    editable: !isDisabled && !isReadOnly,
    onError: (error) => {
      console.error(error);
    },
    editorState: (editor: LexicalEditor) => {
      if (initialValue !== '') {
        loadValue(editor, initialValue, codec);
      }
    },
  }));

  const handleChange = useCallback(
    (next: string) => {
      setCurrentValue(next);
      onChange?.(next);
    },
    [onChange],
  );

  return (
    // LexicalComposer is deprecated in favour of the extension API, which needs @lexical/extension (not one of our
    // peers); it's still supported in 0.52.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    <LexicalComposer initialConfig={initialConfig}>
      <EditorBody
        codec={codec}
        value={value}
        onChange={handleChange}
        lastValueRef={lastValueRef}
        hasSlashMenu={hasSlashMenu}
        uploadImage={uploadImage}
        loadMentions={loadMentions}
        placeholder={placeholder}
        minHeight={minHeight}
        maxHeight={maxHeight}
        isRequired={isRequired}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isInvalid={isInvalid}
        ariaLabel={ariaLabel}
        ariaLabelledBy={ariaLabelledBy}
        ariaDescribedBy={ariaDescribedBy}
        ariaErrorMessage={ariaErrorMessage}
        messages={messages}
      />
      {name !== undefined && <input type="hidden" name={name} value={currentValue} />}
    </LexicalComposer>
  );
}

interface EditorBodyProps {
  codec: EditorCodec;
  value: string | undefined;
  onChange: (value: string) => void;
  lastValueRef: RefObject<string>;
  hasSlashMenu: boolean;
  uploadImage?: EditorImageUploader;
  loadMentions?: EditorMentionLoader;
  placeholder?: string;
  minHeight: string;
  maxHeight?: string;
  isRequired: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaErrorMessage?: string;
  messages: EditorStrings;
}

function EditorBody({
  codec,
  value,
  onChange,
  lastValueRef,
  hasSlashMenu,
  uploadImage,
  loadMentions,
  placeholder,
  minHeight,
  maxHeight,
  isRequired,
  isDisabled,
  isReadOnly,
  isInvalid,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaErrorMessage,
  messages,
}: EditorBodyProps) {
  const [editor] = useLexicalComposerContext();
  const { features } = codec;
  const isEditable = !isDisabled && !isReadOnly;
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  const [imageRequest, setImageRequest] = useState<ImageRequest | null>(null);

  const actions = useMemo(
    () => toolbarGroups.flat().filter((action) => isActionAvailable(action, features)),
    [features],
  );
  const blockActions = useMemo(
    () => slashActions.filter((action) => isActionAvailable(action, features)),
    [features],
  );

  const openLink = useCallback(() => {
    editor.read(() => {
      const selection = $getSelection();
      const node = $isRangeSelection(selection) ? selection.anchor.getNode() : null;
      const link =
        node === null ? null : $isLinkNode(node) ? node : $findMatchingParent(node, $isLinkNode);
      setLinkTarget({ url: link?.getURL() ?? null, selection: selection?.clone() ?? null });
    });
  }, [editor]);

  const openImage = useCallback(
    (file?: File) => {
      editor.read(() => {
        setImageRequest({ kind: 'insert', file, selection: $getSelection()?.clone() ?? null });
      });
    },
    [editor],
  );

  const onAction = useCallback(
    (action: EditorAction) => {
      // Shortcuts and the "/" menu call this while an editor update runs; act once it's done.
      queueMicrotask(() => {
        runAction(editor, action, {
          openLink,
          openImage: () => {
            openImage();
          },
        });
      });
    },
    [editor, openLink, openImage],
  );

  // Pasted or dropped images: one dialog per image (each needs its alt text), in order.
  const imageQueueRef = useRef<File[]>([]);
  const onImageFiles = useCallback(
    (files: File[]) => {
      const [first, ...others] = files;
      imageQueueRef.current.push(...others);
      if (first !== undefined) {
        if (imageRequest === null) {
          openImage(first);
        } else {
          imageQueueRef.current.unshift(first);
        }
      }
    },
    [imageRequest, openImage],
  );
  const closeImage = useCallback(() => {
    setImageRequest(null);
    const next = imageQueueRef.current.shift();
    if (next !== undefined) {
      openImage(next);
    }
  }, [openImage]);

  useEffect(
    () =>
      editor.registerCommand(
        EDIT_IMAGE_COMMAND,
        (nodeKey) => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node) && editor.isEditable()) {
            setImageRequest({ kind: 'edit', nodeKey, src: node.getSrc(), alt: node.getAlt() });
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor],
  );

  const placeholderProps:
    | { 'aria-placeholder'?: undefined; placeholder: null }
    | { 'aria-placeholder': string; placeholder: ReactElement } =
    placeholder === undefined
      ? { placeholder: null }
      : {
          'aria-placeholder': placeholder,
          placeholder: (
            <div className="pointer-events-none absolute start-0 top-0 px-3 py-2 text-base leading-relaxed text-fg-muted select-none">
              {placeholder}
            </div>
          ),
        };

  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col rounded-control border border-border-strong bg-surface-2 text-fg',
        'has-[[contenteditable]:focus-visible]:focus-ring',
        isInvalid && 'border-danger-solid',
        isDisabled && 'opacity-50',
        isReadOnly && 'bg-surface-1',
      )}
    >
      {!isReadOnly && (
        <EditorToolbar
          actions={actions}
          onAction={onAction}
          isDisabled={isDisabled}
          messages={messages}
          linkButtonRef={linkButtonRef}
        />
      )}
      <div className="relative min-w-0">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              ariaLabel={ariaLabel}
              ariaLabelledBy={ariaLabelledBy}
              ariaDescribedBy={ariaDescribedBy}
              ariaErrorMessage={ariaErrorMessage}
              ariaInvalid={isInvalid || undefined}
              ariaRequired={isRequired || undefined}
              ariaMultiline
              aria-disabled={isDisabled || undefined}
              // A read-only document can still be reached and read with the keyboard.
              tabIndex={isReadOnly && !isDisabled ? 0 : undefined}
              // Dynamic geometry: the app's minimum and maximum heights.
              // eslint-disable-next-line no-restricted-syntax
              style={{ minHeight, maxHeight }}
              className={cn(
                'min-w-0 overflow-y-auto px-3 py-2 text-base leading-relaxed text-fg outline-none [overflow-wrap:anywhere]',
                '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
                isDisabled && 'cursor-not-allowed',
              )}
              {...placeholderProps}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <EditablePlugin isEditable={isEditable} />
      <ValuePlugin value={value} codec={codec} onChange={onChange} lastValueRef={lastValueRef} />
      <PolicyPlugin
        features={features}
        onImageFiles={uploadImage !== undefined ? onImageFiles : undefined}
      />
      <ShortcutsPlugin actions={actions} onAction={onAction} />
      <MarkdownShortcutPlugin transformers={shortcutTransformers(codec.transformers)} />
      {(features.has('list') || features.has('checklist')) && <ListPlugin />}
      {features.has('checklist') && <CheckListPlugin />}
      {features.has('link') && <LinkPlugin validateUrl={isSafeUrl} />}
      {features.has('table') && (
        // Tab leaves the editor rather than moving between cells, so the keyboard is never trapped.
        <TablePlugin
          hasCellMerge={false}
          hasCellBackgroundColor={false}
          hasHorizontalScroll
          hasTabHandler={false}
        />
      )}
      {hasSlashMenu && isEditable && (
        <SlashMenuPlugin actions={blockActions} onAction={onAction} messages={messages} />
      )}
      {loadMentions !== undefined && features.has('mention') && isEditable && (
        <MentionsPlugin loadMentions={loadMentions} messages={messages} />
      )}
      {features.has('link') && (
        <LinkPopover
          target={linkTarget}
          onClose={() => {
            setLinkTarget(null);
          }}
          triggerRef={linkButtonRef}
          messages={messages}
        />
      )}
      {features.has('image') && (
        <ImageDialog
          request={imageRequest}
          onClose={closeImage}
          uploadImage={uploadImage}
          messages={messages}
        />
      )}
    </div>
  );
}
