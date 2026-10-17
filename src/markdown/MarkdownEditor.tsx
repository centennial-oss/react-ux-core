// MarkdownEditor: a monospace textarea for Markdown with a formatting toolbar, Markdown-aware Enter and Tab, image
// uploads by paste, drop or the toolbar, and a live preview through `Markdown` (side by side, or behind Write /
// Preview tabs). It's a plain-text field: the value is the Markdown source, and edits go through the browser's own
// editing so undo works as in any textarea.
//
// Keyboard: Enter continues a list (and ends it on an empty item); Tab and Shift+Tab indent and outdent while the caret
// is in a list item or the selection spans lines, and otherwise move focus as usual. Escape releases the next Tab, so
// keyboard users can always leave (the editor describes this to screen readers, and shows it while Tab indents).

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import {
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type Key,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import {
  FieldFrame,
  fieldRootClasses,
  inputClasses,
  inputGroupClasses,
  type FieldBaseProps,
} from '../components/Field/Field';
import { Tab, TabList, TabPanel, Tabs } from '../components/Tabs/Tabs';
import { useAutoGrow } from '../components/TextArea/useAutoGrow';
import { CharacterCount, characterCountState } from '../components/TextField/CharacterCount';
import { cn } from '../utils/cn';
import { mergeRefs } from '../utils/mergeRefs';
import { useControllableState } from '../utils/useControllableState';
import { useElementWidth } from '../utils/useElementWidth';
import { Markdown, type MarkdownProps } from './Markdown';
import {
  applyCommand,
  applyToTextarea,
  capturesTab,
  commandForKey,
  continueList,
  fileStem,
  imageMarkdown,
  indentLines,
  isApplePlatform,
  readState,
  replaceSelection,
  type EditState,
  type MarkdownCommand,
} from './markdownCommands';
import { MarkdownToolbar } from './MarkdownToolbar';
import { useMarkdownMessages } from './messages';

export type MarkdownEditorLayout = 'split' | 'tabs' | 'editor';

/** What `uploadImage` resolves to: the image's address and, optionally, its alt text (the file name otherwise). */
export interface UploadedImage {
  src: string;
  alt?: string;
}

/** Below this width (in rem), the split layout shows as tabs. */
const SPLIT_MIN_REM = 48;

const modifierKeys = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);

function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

export interface MarkdownEditorProps
  extends
    Omit<
      AriaTextFieldProps,
      | 'className'
      | 'style'
      | 'children'
      | 'render'
      | 'type'
      | 'pattern'
      | 'inputMode'
      | 'value'
      | 'defaultValue'
      | 'onChange'
    >,
    FieldBaseProps {
  /** The Markdown source (controlled). */
  value?: string;
  /** The starting Markdown source (uncontrolled). */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /**
   * `split` shows the editor and preview side by side, `tabs` behind Write and Preview tabs, `editor` the editor
   * alone. `split` becomes `tabs` when the editor is narrower than 48rem. Defaults to `split`.
   */
  layout?: MarkdownEditorLayout;
  /** The tab shown first in the tabs layout. Defaults to `write`. */
  defaultTab?: 'write' | 'preview';
  /** A formatting toolbar that inserts Markdown syntax (each button has a shortcut). Defaults to true. */
  hasToolbar?: boolean;
  /**
   * Uploads a pasted, dropped or chosen image and resolves to its address. While it runs, a placeholder sits in the
   * text; it's then replaced by `![alt](src)`. Without it, the image button inserts `![alt](url)` to fill in.
   */
  uploadImage?: (file: File) => Promise<UploadedImage>;
  /** The editor's (and the preview's) minimum height, as a CSS length, on top of `minRows`. */
  minHeight?: string;
  /** The editor's height, in lines, when empty or short. Defaults to 8. */
  minRows?: number;
  /** The most lines the editor grows to before it scrolls (the preview follows its scrolling). Defaults to 20. */
  maxRows?: number;
  /** Shows "count / maxLength" under the editor; needs `maxLength`. */
  hasCharacterCount?: boolean;
  placeholder?: string;
  /**
   * Props for the preview's `Markdown`, so it renders the way the app shows the content elsewhere (heading level,
   * size, code blocks). The preview runs the full width of its pane unless `isFullWidth` is false.
   */
  previewProps?: Omit<MarkdownProps, 'children' | 'className' | 'ref'>;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The textarea element. */
  inputRef?: Ref<HTMLTextAreaElement>;
}

/** A Markdown source editor with a formatting toolbar and a live preview. */
export function MarkdownEditor({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  layout = 'split',
  defaultTab = 'write',
  hasToolbar = true,
  uploadImage,
  minHeight,
  minRows = 8,
  maxRows = 20,
  hasCharacterCount = false,
  placeholder,
  previewProps,
  className,
  ref,
  inputRef,
  value: valueProp,
  defaultValue,
  onChange,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: MarkdownEditorProps) {
  const messages = useMarkdownMessages();
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const previewValue = useDeferredValue(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncPreviewRef = useRef<(() => void) | null>(null);
  const [measureRef, width] = useElementWidth();
  const [isApple] = useState(isApplePlatform);
  const [tab, setTab] = useState<Key>(defaultTab);
  /** Focus is in the text and Tab indents there (the caret is in a list, or the selection spans lines). */
  const [isTabCaptured, setTabCaptured] = useState(false);
  /** Escape was pressed, so the next Tab moves focus even where it would indent. */
  const [isTabReleased, setTabReleased] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const helpId = useId();
  const countId = useId();
  const previewLabelId = useId();
  useAutoGrow(textareaRef, frameRef, value, minRows, maxRows);

  const isDisabled = rest.isDisabled === true;
  const isReadOnly = rest.isReadOnly === true;
  const maxLength = rest.maxLength;

  const remPx =
    width === undefined
      ? 16
      : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const effectiveLayout: MarkdownEditorLayout =
    layout === 'split' && width !== undefined && width < SPLIT_MIN_REM * remPx ? 'tabs' : layout;

  const updateTabCapture = useCallback(() => {
    const textarea = textareaRef.current;
    setTabCaptured(
      textarea !== null &&
        document.activeElement === textarea &&
        !textarea.readOnly &&
        capturesTab(readState(textarea)),
    );
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateTabCapture);
    return () => {
      document.removeEventListener('selectionchange', updateTabCapture);
    };
  }, [updateTabCapture]);

  useLayoutEffect(() => {
    updateTabCapture();
    syncPreviewRef.current?.();
  }, [value, updateTabCapture]);

  // Synced scrolling, side by side: each pane scrolls the other to the same proportion. While the editor is short
  // enough not to scroll, the preview follows the caret's position in the text instead.
  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (effectiveLayout !== 'split' || !textarea || !preview) {
      syncPreviewRef.current = null;
      return;
    }
    /** The pane last scrolled from here, whose next scroll event is that echo rather than the user. */
    let echo: HTMLElement | null = null;
    const scroll = (from: HTMLElement, to: HTMLElement) => {
      if (echo === from) {
        echo = null;
        return;
      }
      const range = from.scrollHeight - from.clientHeight;
      let ratio = range > 0 ? from.scrollTop / range : 0;
      if (range <= 0 && from === textarea && textarea.value.length > 0) {
        ratio = textarea.selectionEnd / textarea.value.length;
      }
      const top = Math.round(ratio * Math.max(0, to.scrollHeight - to.clientHeight));
      if (Math.abs(to.scrollTop - top) >= 1) {
        echo = to;
        to.scrollTop = top;
      }
    };
    const fromEditor = () => {
      scroll(textarea, preview);
    };
    const fromPreview = () => {
      scroll(preview, textarea);
    };
    syncPreviewRef.current = fromEditor;
    textarea.addEventListener('scroll', fromEditor, { passive: true });
    preview.addEventListener('scroll', fromPreview, { passive: true });
    return () => {
      syncPreviewRef.current = null;
      textarea.removeEventListener('scroll', fromEditor);
      preview.removeEventListener('scroll', fromPreview);
    };
  }, [effectiveLayout]);

  // The preview renders a deferred copy of the text; once it catches up, keep it in step with the editor.
  useLayoutEffect(() => {
    syncPreviewRef.current?.();
  }, [previewValue]);

  /** Whether an edit stays within `maxLength` (edits that shorten the text always do). */
  const fits = (next: EditState) =>
    maxLength === undefined || next.value.length <= maxLength || next.value.length <= value.length;

  const runCommand = (command: MarkdownCommand) => {
    const textarea = textareaRef.current;
    if (!textarea || isDisabled || isReadOnly) {
      return;
    }
    if (command === 'image' && uploadImage) {
      fileInputRef.current?.click();
      return;
    }
    const next = applyCommand(command, readState(textarea), {
      urlPlaceholder: messages.markdownEditorUrlPlaceholder,
    });
    if (fits(next)) {
      applyToTextarea(textarea, next);
    }
  };

  /** Swaps an upload's placeholder for its result, keeping the user's selection where it was. */
  const replacePlaceholder = (placeholder: string, text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const state = readState(textarea);
    const index = state.value.indexOf(placeholder);
    if (index === -1) {
      // The user removed the placeholder; leave the text alone.
      return;
    }
    const end = index + placeholder.length;
    const shift = (position: number) => {
      if (position <= index) {
        return position;
      }
      return position >= end ? position + text.length - placeholder.length : index + text.length;
    };
    applyToTextarea(
      textarea,
      {
        value: state.value.slice(0, index) + text + state.value.slice(end),
        selectionStart: shift(state.selectionStart),
        selectionEnd: shift(state.selectionEnd),
      },
      // An upload finishing while focus is elsewhere mustn't pull focus back into the editor.
      { shouldKeepFocus: document.activeElement !== textarea },
    );
  };

  const uploadFiles = (files: File[]) => {
    const textarea = textareaRef.current;
    const images = files.filter(isImage);
    if (!uploadImage || !textarea || images.length === 0 || isDisabled || isReadOnly) {
      return;
    }
    setUploadError(null);
    const placeholders = images.map((file) =>
      imageMarkdown('', messages.markdownEditorUploading({ name: file.name })),
    );
    applyToTextarea(textarea, replaceSelection(readState(textarea), placeholders.join('\n')));
    images.forEach((file, index) => {
      const placeholder = placeholders[index] ?? '';
      uploadImage(file).then(
        (result) => {
          replacePlaceholder(
            placeholder,
            imageMarkdown(result.src, result.alt ?? fileStem(file.name)),
          );
        },
        () => {
          replacePlaceholder(placeholder, '');
          setUploadError(messages.markdownEditorUploadFailed({ name: file.name }));
        },
      );
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    if (event.nativeEvent.isComposing || textarea.readOnly || textarea.disabled) {
      return;
    }
    const state = readState(textarea);
    if (event.key === 'Escape') {
      if (!isTabReleased && capturesTab(state)) {
        setTabReleased(true);
        // This Escape only releases Tab; it shouldn't also close a dialog the editor is in.
        event.stopPropagation();
      }
      return;
    }
    if (event.key === 'Tab') {
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      if (!isTabReleased && !hasModifier && capturesTab(state)) {
        event.preventDefault();
        applyToTextarea(textarea, indentLines(state, event.shiftKey ? -1 : 1));
      }
      return;
    }
    if (!modifierKeys.has(event.key)) {
      setTabReleased(false);
    }
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const next = continueList(state);
      if (next && fits(next)) {
        event.preventDefault();
        applyToTextarea(textarea, next);
      }
      return;
    }
    const command = commandForKey(event.nativeEvent, isApple);
    if (command) {
      event.preventDefault();
      runCommand(command);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!uploadImage) {
      return;
    }
    const files = Array.from(event.clipboardData.files).filter(isImage);
    // Copying from some apps puts both an image and its text on the clipboard; the text wins.
    if (files.length > 0 && event.clipboardData.getData('text/plain') === '') {
      event.preventDefault();
      uploadFiles(files);
    }
  };

  const onDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    if (uploadImage && event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
    }
  };

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    if (!uploadImage || event.dataTransfer.files.length === 0) {
      return;
    }
    // A file dropped here never opens in the browser; images upload, other files are ignored.
    event.preventDefault();
    event.currentTarget.focus();
    uploadFiles(Array.from(event.dataTransfer.files));
  };

  const count = characterCountState({ count: value.length, maxLength, hasCharacterCount });
  const describedBy = [ariaDescribedBy, helpId, count.isShown ? countId : undefined]
    .filter(Boolean)
    .join(' ');
  const tabHint = isTabCaptured
    ? isTabReleased
      ? messages.markdownEditorTabMovesFocus
      : messages.markdownEditorTabIndents
    : null;

  const editor = (
    <div ref={frameRef} className={cn(inputGroupClasses, 'flex-col items-stretch overflow-hidden')}>
      {hasToolbar && (
        <MarkdownToolbar
          onCommand={runCommand}
          onImageFiles={uploadImage ? uploadFiles : undefined}
          fileInputRef={fileInputRef}
          isDisabled={isDisabled || isReadOnly}
          messages={messages}
        />
      )}
      <AriaTextArea
        ref={mergeRefs(textareaRef, inputRef)}
        rows={minRows}
        placeholder={placeholder}
        // Dynamic geometry: the minimum height is the app's CSS length.
        // eslint-disable-next-line no-restricted-syntax
        style={minHeight === undefined ? undefined : { minHeight }}
        // flex-none: in the column under the toolbar, the auto-grown height must not give way to a flex basis.
        className={cn(inputClasses, 'h-auto flex-none resize-none py-2 font-mono')}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onFocus={updateTabCapture}
        onBlur={() => {
          setTabCaptured(false);
          setTabReleased(false);
        }}
      />
    </div>
  );

  const preview =
    previewValue.trim() === '' ? (
      <p className="text-sm text-fg-muted">{messages.markdownEditorEmptyPreview}</p>
    ) : (
      <Markdown isFullWidth {...previewProps}>
        {previewValue}
      </Markdown>
    );

  let body;
  if (effectiveLayout === 'split') {
    body = (
      <div className="grid grid-cols-2 gap-3">
        {editor}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-control border border-border bg-surface-1">
          <div
            id={previewLabelId}
            className="flex min-h-10 shrink-0 items-center border-b border-border px-3 text-xs font-medium text-fg-muted"
          >
            {messages.markdownEditorPreview}
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              ref={previewRef}
              role="region"
              aria-labelledby={previewLabelId}
              // The preview scrolls inside its pane, so it takes focus for keyboard scrolling.
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              className="absolute inset-0 overflow-y-auto overscroll-contain rounded-b-control p-3 outline-none focus-visible:focus-ring focus-visible:-outline-offset-2"
            >
              {preview}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (effectiveLayout === 'tabs') {
    body = (
      <Tabs selectedKey={tab} onSelectionChange={setTab}>
        <TabList aria-label={messages.markdownEditorView}>
          <Tab id="write">{messages.markdownEditorWrite}</Tab>
          <Tab id="preview">{messages.markdownEditorPreview}</Tab>
        </TabList>
        {/* The editor stays mounted behind the Preview tab, keeping its undo history and selection. */}
        <TabPanel id="write" shouldForceMount className="pt-2">
          {editor}
        </TabPanel>
        <TabPanel id="preview" className="pt-2">
          <div
            // Dynamic geometry: the minimum height is the app's CSS length.
            // eslint-disable-next-line no-restricted-syntax
            style={minHeight === undefined ? undefined : { minHeight }}
            className="min-h-40 rounded-control border border-border bg-surface-1 p-3"
          >
            {preview}
          </div>
        </TabPanel>
      </Tabs>
    );
  } else {
    body = editor;
  }

  return (
    <AriaTextField
      {...rest}
      ref={ref}
      aria-describedby={describedBy}
      value={value}
      onChange={setValue}
      className={fieldRootClasses(className)}
    >
      <FieldFrame
        label={label}
        description={description}
        errorMessage={errorMessage}
        labelPosition={labelPosition}
        infoTip={infoTip}
        isRequired={rest.isRequired}
      >
        <div ref={measureRef} className="min-w-0" data-layout={effectiveLayout}>
          {body}
        </div>
        {(tabHint !== null || count.isShown) && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-fg-muted">{tabHint}</span>
            {count.isShown && (
              <CharacterCount
                id={countId}
                count={value.length}
                maxLength={maxLength}
                isOver={false}
              />
            )}
          </div>
        )}
        {uploadError !== null && (
          <p role="alert" className="text-xs font-medium text-danger-fg">
            {uploadError}
          </p>
        )}
      </FieldFrame>
      <span id={helpId} hidden>
        {messages.markdownEditorKeyboardHelp}
      </span>
    </AriaTextField>
  );
}
