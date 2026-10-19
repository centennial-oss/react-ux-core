// Composer: the message box under a chat. It grows with its text, sends on Enter (or ⌘/Ctrl+Enter), suggests
// @-mentions (loaded by the app) and /commands in a listbox above the text, attaches files (chooser, drop or paste),
// inserts emoji, and shows a context bar such as "Replying to Ada". Sending shows a pending state, then clears; a
// failure keeps the text. On phones it stays above the on-screen keyboard (visualViewport).
//
// Keyboard: while suggestions show, Up and Down choose, Enter or Tab inserts, Escape closes them; the text area keeps
// focus throughout (the list is announced through aria-activedescendant and a polite live region).
import { Paperclip, SendHorizontal, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  DropZone as AriaDropZone,
  FileTrigger,
  isFileDropItem,
  TextArea,
  TextField,
} from 'react-aria-components';
import { Avatar } from '../components/Avatar/Avatar';
import { IconButton } from '../components/IconButton/IconButton';
import { InfoTip } from '../components/InfoTip/InfoTip';
import { Kbd } from '../components/Kbd/Kbd';
import { LiveRegion, useAnnouncer } from '../components/LiveRegion/LiveRegion';
import { useAutoGrow } from '../components/TextArea/useAutoGrow';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { FilePreviewList } from '../media/files/FilePreviewList';
import { cn } from '../utils/cn';
import { isApplePlatform } from '../utils/keyboard';
import { useDebouncedCallback } from '../utils/timers';
import { useControllableState } from '../utils/useControllableState';
import {
  commandIn,
  findSuggestionTrigger,
  insertAt,
  insertToken,
  matchCommands,
  mentionedIds,
  sameTrigger,
  type SuggestionTrigger,
} from './composerText';
import type { EmojiDataLoader, SkinTone } from './emojiData';
import { EmojiPickerButton } from './EmojiPicker';
import { useChatMessages, type ChatStrings } from './messages';
import type { ChatCommand, ChatMention, ChatSubmission } from './types';

/** How long typing must pause before mentions load, in milliseconds. */
const MENTION_DELAY_MS = 120;

export interface ComposerProps {
  /** The text. Controlled; uncontrolled, the draft is kept while the Composer is mounted. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Sends the message. Return a promise to show a pending state; reject to keep the text (and show an error). */
  onSubmit: (message: ChatSubmission) => Promise<void> | void;
  placeholder?: string;
  /** `enter` sends on Enter, with Shift+Enter for a new line (the default); `mod-enter` sends on ⌘/Ctrl+Enter. */
  sendKey?: 'enter' | 'mod-enter';
  /** Suggests people (or things) after "@". Aborted when the query changes. */
  loadMentions?: (query: string, signal: AbortSignal) => Promise<readonly ChatMention[]>;
  /** Offers /commands, with descriptions, when the text starts with "/". */
  commands?: readonly ChatCommand[];
  /** Lets files be attached: a file chooser, dropping on the composer, and pasting images. */
  hasAttachments?: boolean;
  /** The file chooser's accepted types, as in an input's `accept` (such as `['image/*']`). */
  accept?: readonly string[];
  /** Shows an emoji button that opens the EmojiPicker. */
  hasEmoji?: boolean;
  /** Recently used emoji, for the picker. */
  recentEmoji?: readonly string[];
  skinTone?: SkinTone;
  onSkinToneChange?: (tone: SkinTone) => void;
  loadEmojiData?: EmojiDataLoader;
  /** Shown above the text, such as `<ComposerReplyContext author="Ada" onCancel={…} />`. */
  context?: ReactNode;
  maxLength?: number;
  isDisabled?: boolean;
  /** Lines when empty. Defaults to 1. */
  minRows?: number;
  /** Lines before the text scrolls instead of growing. Defaults to 8. */
  maxRows?: number;
  /** Names the text area. Defaults to the `composerLabel` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** How far the on-screen keyboard covers the layout viewport's bottom, in pixels (0 without one). */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(covered > 1 ? Math.round(covered) : 0);
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}

type Suggestion =
  | { kind: 'mention'; key: string; mention: ChatMention }
  | { kind: 'command'; key: string; command: ChatCommand };

/** The message box of a chat, with mentions, commands, attachments and emoji. */
export function Composer({
  value: valueProp,
  defaultValue,
  onChange,
  onSubmit,
  placeholder,
  sendKey = 'enter',
  loadMentions,
  commands,
  hasAttachments = false,
  accept,
  hasEmoji = false,
  recentEmoji,
  skinTone,
  onSkinToneChange,
  loadEmojiData,
  context,
  maxLength,
  isDisabled = false,
  minRows = 1,
  maxRows = 8,
  'aria-label': ariaLabel,
  className,
  ref,
}: ComposerProps) {
  const messages = useChatMessages();
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, setPending] = useState(false);
  const [hasFailed, setFailed] = useState(false);
  const [isFocusWithin, setFocusWithin] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { ref: liveRef, announce } = useAnnouncer();
  const selection = useRef({ start: value.length, end: value.length });
  const pendingCaret = useRef<number | null>(null);
  const chosenMentions = useRef<ChatMention[]>([]);
  const listId = useId();
  const keyboardInset = useKeyboardInset();
  useAutoGrow(textareaRef, frameRef, value, minRows, maxRows);

  // Suggestions.
  const [trigger, setTrigger] = useState<SuggestionTrigger | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionResults, setMentionResults] = useState<{
    query: string;
    items: readonly ChatMention[];
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetchMentions = useDebouncedCallback((query: string) => {
    if (!loadMentions) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadMentions(query, controller.signal).then(
      (items) => {
        if (!controller.signal.aborted) {
          setMentionResults({ query, items });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setMentionResults({ query, items: [] });
        }
      },
    );
  }, MENTION_DELAY_MS);
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!trigger) {
      return [];
    }
    if (trigger.kind === 'command') {
      return matchCommands(commands ?? [], trigger.query).map((command) => ({
        kind: 'command',
        key: command.id,
        command,
      }));
    }
    if (mentionResults?.query !== trigger.query) {
      return [];
    }
    return mentionResults.items.map((mention) => ({ kind: 'mention', key: mention.id, mention }));
  }, [trigger, commands, mentionResults]);
  const isEditable = !isDisabled && !isPending;
  const isOpen =
    isEditable && trigger !== null && dismissedAt !== trigger.start && suggestions.length > 0;
  const active = Math.min(activeIndex, Math.max(suggestions.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${String(index)}`;

  // Put the caret after an insertion once the new value is in the text area.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const caret = pendingCaret.current;
    if (!textarea || caret === null || textarea.value !== value) {
      return;
    }
    pendingCaret.current = null;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    selection.current = { start: caret, end: caret };
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      listRef.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, active]);

  // Announce the suggestions as they change.
  const announcement = isOpen
    ? messages.composerSuggestionCount({ count: suggestions.length })
    : '';
  useEffect(() => {
    if (announcement !== '') {
      announce(announcement);
    }
  }, [announcement, announce]);

  /** Reads the caret from the text area and updates the trigger being typed. */
  const syncCaret = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    selection.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
    let next =
      textarea.selectionStart === textarea.selectionEnd
        ? findSuggestionTrigger(textarea.value, textarea.selectionStart)
        : null;
    if (next?.kind === 'command' && !commands?.length) {
      next = null;
    }
    if (next?.kind === 'mention' && !loadMentions) {
      next = null;
    }
    if (!sameTrigger(trigger, next)) {
      setTrigger(next);
      setActiveIndex(0);
      if (!next) {
        setDismissedAt(null);
        fetchMentions.cancel();
      } else if (next.kind === 'mention') {
        fetchMentions.run(next.query);
      }
    }
  };

  const choose = (suggestion: Suggestion) => {
    if (!trigger) {
      return;
    }
    const text = textareaRef.current?.value ?? value;
    const token =
      suggestion.kind === 'mention'
        ? `@${suggestion.mention.label}`
        : `/${suggestion.command.label}`;
    if (suggestion.kind === 'mention') {
      chosenMentions.current = [...chosenMentions.current, suggestion.mention];
    }
    const next = insertToken(text, trigger, token);
    setTrigger(null);
    pendingCaret.current = next.caret;
    setValue(next.text);
  };

  const insertEmoji = (emoji: string) => {
    const { start, end } = selection.current;
    const next = insertAt(value, start, end, emoji);
    setValue(next.text);
    selection.current = { start: next.caret, end: next.caret };
    // The popover returns focus to its button as it closes; take it back to the text afterwards.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        textarea?.focus();
        textarea?.setSelectionRange(next.caret, next.caret);
      });
    });
  };

  const addFiles = (added: readonly File[]) => {
    if (added.length === 0) {
      return;
    }
    setFiles((current) => [...current, ...added]);
    announce(messages.composerAttached({ count: added.length }));
  };

  const hasContent = value.trim() !== '' || files.length > 0;
  const isOverLimit = maxLength !== undefined && value.length > maxLength;

  const submit = async () => {
    if (!isEditable || !hasContent || isOverLimit) {
      return;
    }
    const text = value.trim();
    const command = commands ? commandIn(text, commands) : undefined;
    const message: ChatSubmission = {
      text,
      attachments: files,
      mentions: mentionedIds(text, chosenMentions.current),
      ...(command === undefined ? {} : { command }),
    };
    setPending(true);
    setFailed(false);
    try {
      await onSubmit(message);
      setValue('');
      setFiles([]);
      chosenMentions.current = [];
      selection.current = { start: 0, end: 0 };
      setTrigger(null);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((active + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((active - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        const choice = suggestions[active];
        if (choice) {
          event.preventDefault();
          choose(choice);
        }
        return;
      }
      if (event.key === 'Escape') {
        // Close the suggestions only; don't let a surrounding dialog close too.
        event.preventDefault();
        event.stopPropagation();
        setDismissedAt(trigger.start);
        return;
      }
    }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return;
    }
    const isMod = event.metaKey || event.ctrlKey;
    const sends =
      sendKey === 'enter' ? !event.shiftKey && !event.altKey && !isMod : isMod && !event.shiftKey;
    if (sends) {
      event.preventDefault();
      void submit();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!hasAttachments || !isEditable) {
      return;
    }
    const pasted = [...event.clipboardData.files];
    if (pasted.length === 0) {
      return;
    }
    // A pasted screenshot has no text: attach it instead of pasting nothing. With text too, paste both.
    if (event.clipboardData.getData('text/plain') === '') {
      event.preventDefault();
    }
    addFiles(pasted);
  };

  const shortcuts = useShortcuts(
    messages,
    sendKey,
    commands !== undefined,
    loadMentions !== undefined,
  );

  const body = (
    <div
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: room for the on-screen keyboard.
      style={isFocusWithin && keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined}
      onFocus={() => {
        setFocusWithin(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
      className="flex min-w-0 flex-col gap-2"
    >
      {context !== undefined && context !== null && context}
      {files.length > 0 && (
        <FilePreviewList
          files={files}
          size="sm"
          aria-label={messages.composerAttachments}
          onRemove={(index) => {
            setFiles((current) => current.filter((_, position) => position !== index));
            textareaRef.current?.focus();
          }}
        />
      )}
      <div className="relative">
        {isOpen && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={
              trigger.kind === 'mention'
                ? messages.composerMentionSuggestions
                : messages.composerCommandSuggestions
            }
            className="absolute inset-x-0 bottom-full z-dropdown mb-2 flex max-h-60 flex-col gap-0.5 overflow-auto rounded-card border border-border bg-surface-2 p-1 shadow-overlay"
          >
            {suggestions.map((suggestion, index) => (
              // The text area keeps focus and handles the keyboard (aria-activedescendant); the pointer can pick too.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={suggestion.key}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                tabIndex={-1}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  choose(suggestion);
                }}
                className={cn(
                  'flex min-h-hit cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-sm text-fg',
                  'hover:bg-surface-3',
                  index === active && 'bg-surface-3',
                )}
              >
                {suggestion.kind === 'mention' ? (
                  <>
                    <span aria-hidden="true">
                      <Avatar
                        name={suggestion.mention.label}
                        src={suggestion.mention.avatarSrc}
                        size="xs"
                      />
                    </span>
                    <span className="min-w-0 truncate">{suggestion.mention.label}</span>
                  </>
                ) : (
                  <span className="flex min-w-0 flex-col">
                    <span className="font-mono">{`/${suggestion.command.label}`}</span>
                    {suggestion.command.description !== undefined && (
                      <span className="text-xs text-fg-muted">
                        {suggestion.command.description}
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div
          ref={frameRef}
          className={cn(
            'flex min-h-hit w-full items-end gap-1 rounded-control border border-border-strong bg-surface-2 p-1 text-fg',
            'has-[textarea:focus-visible]:focus-ring',
            isDisabled && 'opacity-50',
            isOverLimit && 'border-danger-solid',
          )}
        >
          {hasAttachments && (
            <FileTrigger
              allowsMultiple
              acceptedFileTypes={accept}
              onSelect={(list) => {
                addFiles(list ? [...list] : []);
              }}
            >
              <Tooltip content={messages.composerAttach}>
                <IconButton
                  icon={Paperclip}
                  size="sm"
                  aria-label={messages.composerAttach}
                  isDisabled={!isEditable}
                  className="text-fg-muted"
                />
              </Tooltip>
            </FileTrigger>
          )}
          <TextField
            aria-label={ariaLabel ?? messages.composerLabel}
            value={value}
            onChange={(text) => {
              setValue(text);
              setFailed(false);
              syncCaret();
            }}
            onBlur={() => {
              setTrigger(null);
            }}
            isDisabled={isDisabled}
            isReadOnly={isPending}
            isInvalid={isOverLimit}
            validationBehavior="aria"
            className="flex min-w-0 flex-1"
          >
            <TextArea
              ref={textareaRef}
              rows={minRows}
              placeholder={placeholder ?? messages.composerPlaceholder}
              aria-autocomplete={loadMentions || commands ? 'list' : undefined}
              aria-controls={isOpen ? listId : undefined}
              aria-activedescendant={isOpen ? optionId(active) : undefined}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onSelect={syncCaret}
              onClick={syncCaret}
              className="min-h-8 w-full min-w-0 flex-1 resize-none self-center bg-transparent px-2 py-1 text-base text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed sm:text-sm"
            />
          </TextField>
          {hasEmoji && (
            <EmojiPickerButton
              isDisabled={!isEditable}
              recent={recentEmoji}
              skinTone={skinTone}
              onSkinToneChange={onSkinToneChange}
              loadEmojiData={loadEmojiData}
              onSelect={insertEmoji}
              className="text-fg-muted"
            />
          )}
          <span className="hidden self-center sm:inline-flex">
            <InfoTip aria-label={messages.composerShortcuts} title={messages.composerShortcuts}>
              {shortcuts}
            </InfoTip>
          </span>
          <Tooltip content={messages.composerSend}>
            <IconButton
              icon={SendHorizontal}
              size="sm"
              variant="solid"
              tone="accent"
              aria-label={messages.composerSend}
              isPending={isPending}
              isDisabled={isDisabled || !hasContent || isOverLimit}
              onPress={() => {
                void submit();
              }}
            />
          </Tooltip>
        </div>
      </div>
      {(hasFailed || (maxLength !== undefined && value.length >= maxLength * 0.8)) && (
        <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
          {hasFailed ? (
            <p role="alert" className="m-0 text-danger-fg">
              {messages.composerSendFailed}
            </p>
          ) : (
            <span />
          )}
          {maxLength !== undefined && value.length >= maxLength * 0.8 && (
            <span className={cn('tabular-nums', isOverLimit ? 'text-danger-fg' : 'text-fg-muted')}>
              {messages.characterCount({ count: value.length, max: maxLength })}
            </span>
          )}
        </div>
      )}
      <LiveRegion ref={liveRef} />
    </div>
  );

  return (
    <div ref={ref} className={cn('relative min-w-0', className)}>
      {hasAttachments ? (
        <AriaDropZone
          aria-label={messages.composerDropFiles}
          isDisabled={!isEditable}
          getDropOperation={() => (isEditable ? 'copy' : 'cancel')}
          onDrop={(event) => {
            const items = event.items.filter(isFileDropItem);
            void Promise.all(items.map((item) => item.getFile())).then(addFiles);
          }}
          className="rounded-card outline-none data-drop-target:bg-accent-bg data-drop-target:ring-2 data-drop-target:ring-accent-solid data-focus-visible:focus-ring"
        >
          {body}
        </AriaDropZone>
      ) : (
        body
      )}
    </div>
  );
}

/** The shortcuts help, matching `sendKey` and what's on offer. */
function useShortcuts(
  messages: ChatStrings,
  sendKey: 'enter' | 'mod-enter',
  hasCommands: boolean,
  hasMentions: boolean,
): ReactNode {
  const [mod] = useState(() => (isApplePlatform() ? messages.keyModApple : messages.keyModOther));
  const enter = <Kbd>{messages.keyEnter}</Kbd>;
  const rows: { key: string; keys: ReactNode; label: string }[] = [
    {
      key: 'send',
      keys:
        sendKey === 'enter' ? (
          enter
        ) : (
          <>
            <Kbd>{mod}</Kbd>
            {enter}
          </>
        ),
      label: messages.composerShortcutSend,
    },
    {
      key: 'newline',
      keys:
        sendKey === 'enter' ? (
          <>
            <Kbd>{messages.keyShift}</Kbd>
            {enter}
          </>
        ) : (
          enter
        ),
      label: messages.composerShortcutNewLine,
    },
  ];
  if (hasMentions) {
    rows.push({ key: 'mention', keys: <Kbd>@</Kbd>, label: messages.composerShortcutMention });
  }
  if (hasCommands) {
    rows.push({ key: 'command', keys: <Kbd>/</Kbd>, label: messages.composerShortcutCommand });
  }
  if (hasMentions || hasCommands) {
    rows.push({
      key: 'close',
      keys: <Kbd>{messages.keyEscape}</Kbd>,
      label: messages.composerShortcutClose,
    });
  }
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <dt className="flex items-center gap-0.5">{row.keys}</dt>
          <dd className="m-0">{row.label}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface ComposerReplyContextProps {
  /** Who's being replied to. */
  author: string;
  /** A short quote of the message. */
  excerpt?: string;
  /** Cancels the reply. */
  onCancel: () => void;
  className?: string;
}

/** The Composer's "Replying to Ada" bar, with a cancel button: pass it as `context`. */
export function ComposerReplyContext({
  author,
  excerpt,
  onCancel,
  className,
}: ComposerReplyContextProps) {
  const messages = useChatMessages();
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-control border-s-4 border-accent-solid bg-surface-2 py-1 ps-2 pe-1 text-sm',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-fg">{messages.composerReplyingTo({ author })}</span>
        {excerpt !== undefined && <span className="truncate text-xs text-fg-muted">{excerpt}</span>}
      </div>
      <Tooltip content={messages.cancel}>
        <IconButton
          icon={X}
          size="sm"
          aria-label={messages.composerCancelReply}
          onPress={onCancel}
        />
      </Tooltip>
    </div>
  );
}
