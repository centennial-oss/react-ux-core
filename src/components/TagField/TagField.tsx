// TagField: free-text values entered as tags. Enter or a delimiter adds the typed text; pasted lists split into tags;
// Backspace in the empty input takes the last tag into the input to edit (it stays in the value until the edit is
// put back). Tags are a React Aria grid (the same rows a TagGroup renders), so they can also be dragged into order;
// `suggestions` turn the input into a combo box.

import { ChevronDown, CircleAlert } from 'lucide-react';
import {
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Button as AriaButton,
  ComboBox as AriaComboBox,
  ComboBoxStateContext,
  DropIndicator,
  GridList,
  GridListItem,
  Input,
  ListBox,
  Popover as AriaPopover,
  Text,
  TextField as AriaTextField,
  useDragAndDrop,
  useFilter,
  type Key,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { reorderStrings, tagFieldStrings } from '../../provider/coreStrings';
import { joinIds } from '../../utils/aria';
import { cn } from '../../utils/cn';
import { dropMove, moveIdsTo, sameItems } from '../../utils/collections';
import { mergeRefs } from '../../utils/mergeRefs';
import { insertedText } from '../../utils/text';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import { Chip } from '../Chip/Chip';
import {
  chipGroupClasses,
  chipInputClasses,
  FieldFrame,
  fieldRootClasses,
  inputButtonClasses,
  inputGroupClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { PlainFieldError } from '../Field/PlainField';
import { ListBoxEmpty, Option, listBoxClasses } from '../ListBox/ListBoxParts';
import { LiveRegion, useAnnouncer } from '../LiveRegion/LiveRegion';
import { popoverClasses } from '../Overlay/styles';
import {
  addTags,
  allowedTags,
  splitPasted,
  splitTyped,
  tagKeys,
  type TagRefusal,
  type TagRules,
} from './tags';

export interface TagFieldProps extends FieldBaseProps {
  /** The tags, controlled. */
  value?: readonly string[];
  /** The initial tags, uncontrolled. */
  defaultValue?: readonly string[];
  onChange?: (value: string[]) => void;
  /** Text that ends a tag as it's typed or pasted, besides Enter. Pasted text also splits at line breaks. Defaults to `[',']`. */
  delimiters?: readonly string[];
  /**
   * Checks each tag. Return a message to mark the tag invalid: it shows in the danger tone, the field is invalid, and
   * the message is listed under the field and read with the tag.
   */
  validateTag?: (tag: string) => string | null | undefined;
  /** Allows the same tag more than once. Defaults to false: a repeat is refused with a message. */
  allowsDuplicates?: boolean;
  /** The most tags the field takes. More are refused with a message. */
  maxItems?: number;
  /** Tags to suggest in a list, filtered as the user types (the first 100 matches show). */
  suggestions?: readonly string[];
  /**
   * With `suggestions`, `false` accepts only tags from the list, and text that matches none is cleared (with a
   * message) when the field is left. Defaults to true, unlike ComboBox's: tags are free text unless restricted. No
   * effect without `suggestions`.
   */
  allowsCustomValue?: boolean;
  /** Tags can be put in order by dragging them, or from the keyboard with each tag's drag handle. Defaults to false. */
  isReorderable?: boolean;
  /** Shown while there are no tags. */
  placeholder?: string;
  isDisabled?: boolean;
  /** Shows the tags without remove buttons; nothing can be added, removed or moved. */
  isReadOnly?: boolean;
  /** At least one tag is needed. */
  isRequired?: boolean;
  isInvalid?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The text input. */
  inputRef?: Ref<HTMLInputElement>;
}

const strings = { ...reorderStrings, ...tagFieldStrings };
const DEFAULT_DELIMITERS = [','];
/** The most suggestions listed at once, so a long list stays quick to filter and render. */
const SUGGESTION_LIMIT = 100;

interface Token {
  id: string;
  tag: string;
  index: number;
  problem: string | undefined;
}

interface SuggestionItem {
  id: string;
}

/** The tag whose text is in the input to edit, and where it was. */
interface Editing {
  index: number;
  tag: string;
}

/**
 * Free-text values as tags, in the standard field frame. Enter or a delimiter adds the typed text, and pasted lists
 * split into tags. Backspace in the empty input takes the last tag into the input to edit (Enter on a tag edits that
 * one; Delete removes it): Enter or leaving the field puts it back in place, and Escape cancels. Repeats and tags past
 * `maxItems` are refused with a message; `validateTag` marks invalid tags. Optional `suggestions` filter as you type,
 * and `isReorderable` lets tags be dragged into order.
 */
export function TagField({
  value: valueProp,
  defaultValue,
  onChange,
  delimiters = DEFAULT_DELIMITERS,
  validateTag,
  allowsDuplicates = false,
  maxItems,
  suggestions,
  allowsCustomValue = true,
  isReorderable = false,
  placeholder,
  isDisabled = false,
  isReadOnly = false,
  isRequired = false,
  isInvalid = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  size = 'md',
  className,
  ref,
  inputRef,
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
}: TagFieldProps) {
  const messages = useEntryMessages(strings);
  const [tags, setTags] = useControllableState<readonly string[]>(
    valueProp,
    defaultValue ?? [],
    onChange as ((next: readonly string[]) => void) | undefined,
  );
  const [text, setText] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  /** After a removal, what to focus once the tags are `tags`: the tag now at an index, or the input. */
  const pendingFocus = useRef<{ target: number | 'input'; tags: readonly string[] } | null>(null);
  const localInputRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const refusalId = useId();
  const { ref: announcerRef, announce } = useAnnouncer();
  const { contains } = useFilter({ sensitivity: 'base' });
  const isLocked = isDisabled || isReadOnly;
  const canReorder = isReorderable && !isLocked;
  const hasListButton = suggestions !== undefined && !isLocked;
  const isRestricted = suggestions !== undefined && !allowsCustomValue;

  // Where the tag being edited is now: found again if the tags moved meanwhile, or -1 (no edit) if it's gone.
  const editAt =
    editing === null
      ? -1
      : tags[editing.index] === editing.tag
        ? editing.index
        : tags.indexOf(editing.tag);

  const tokens = useMemo(() => {
    const keys = tagKeys(tags);
    return tags.map((tag, index): Token => ({
      id: keys[index] ?? tag,
      tag,
      index,
      problem: problemOf(validateTag?.(tag)),
    }));
  }, [tags, validateTag]);
  // The tag being edited is in the input instead.
  const shownTokens = useMemo(
    () => (editAt < 0 ? tokens : tokens.filter((token) => token.index !== editAt)),
    [tokens, editAt],
  );
  const invalidTokens = tokens.filter((token) => token.problem !== undefined);

  const shownSuggestions = useMemo(() => {
    const shown: SuggestionItem[] = [];
    if (!suggestions) {
      return shown;
    }
    // Chosen tags drop out of the list, except the one being edited.
    const chosen = allowsDuplicates
      ? undefined
      : new Set(editAt < 0 ? tags : tags.filter((_, at) => at !== editAt));
    for (const suggestion of suggestions) {
      if (shown.length >= SUGGESTION_LIMIT) {
        break;
      }
      if (!chosen?.has(suggestion) && contains(suggestion, text)) {
        shown.push({ id: suggestion });
      }
    }
    return shown;
  }, [suggestions, allowsDuplicates, tags, editAt, contains, text]);

  // Focus follows a removal: the tag now in the removed one's place (or the one before it), or the input. Only the
  // change it waited for moves focus; a parent may have turned the removal down.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (pending === null || !sameItems(pending.tags, tags)) {
      return;
    }
    if (pending.target === 'input') {
      localInputRef.current?.focus();
      return;
    }
    groupRef.current
      ?.querySelector<HTMLElement>(`[data-tag-index="${String(pending.target)}"]`)
      ?.focus();
  }, [tags]);

  const refusalText = ({ tag, reason }: TagRefusal): string => {
    switch (reason) {
      case 'duplicate':
        return messages.tagDuplicate({ tag });
      case 'limit':
        return messages.tagLimit({ max: maxItems ?? tags.length });
      case 'notInList':
        return messages.tagNotInList({ tag });
    }
  };

  /**
   * Adds tags, in place of the tag being edited or at the end, and returns the text to leave in the input: refused
   * tags to fix (not repeats, which are already there), then `rest`. An edit nothing replaces keeps its tag.
   */
  const commit = (candidates: readonly string[], rest = ''): string => {
    const isEditing = editAt >= 0;
    // An edited tag put back as it was is no change, even one the rules would refuse now.
    if (isEditing && candidates.length === 1 && candidates[0] === tags[editAt]) {
      setEditing(null);
      setRefusal(null);
      return rest;
    }
    // The suggestion lookup is built here, per commit, not on every render.
    const rules: TagRules = {
      allowsDuplicates,
      maxItems,
      allowed: isRestricted ? allowedTags(suggestions) : undefined,
    };
    const base = isEditing ? tags.filter((_, at) => at !== editAt) : tags;
    const result = addTags(base, candidates, rules, isEditing ? editAt : tags.length);
    const kept = result.refused
      .filter((item) => item.reason !== 'duplicate')
      .map((item) => item.tag);
    if (result.added.length > 0) {
      setTags(result.tags);
      setEditing(null);
    } else if (kept.length === 0) {
      setEditing(null);
    }
    const [added] = result.added;
    const addedText =
      added === undefined
        ? undefined
        : result.added.length === 1
          ? messages.tagAdded({ tag: added })
          : messages.tagsAdded({ count: result.added.length });
    const [refused] = result.refused;
    const refusedText = refused ? refusalText(refused) : undefined;
    setRefusal(refusedText ?? null);
    // One announcement: a second straight after would replace the first before it's read.
    if (addedText !== undefined && refusedText !== undefined) {
      announce(messages.tagsAddedWithRefusal({ added: addedText, refusal: refusedText }));
    } else if (addedText !== undefined || refusedText !== undefined) {
      announce(addedText ?? refusedText ?? '');
    }
    if (rest !== '') {
      kept.push(rest);
    }
    return kept.join(`${delimiters[0] ?? ','} `);
  };

  /** Removes a tag; focus then moves to its neighbour (or the input), unless `movesFocus` is false. */
  const remove = (index: number, movesFocus = true) => {
    const tag = tags[index];
    if (tag === undefined || isLocked) {
      return;
    }
    const next = tags.filter((_, at) => at !== index);
    if (movesFocus) {
      pendingFocus.current = {
        target: next.length === 0 ? 'input' : Math.min(index, next.length - 1),
        tags: next,
      };
    }
    setTags(next);
    announce(messages.tagRemoved({ tag }));
  };
  // Rows are cached by React Aria until their tag changes, so their remove buttons call the latest `remove` (and
  // through it the latest `onChange`), not the one from when they were rendered.
  const latestRemove = useLatest(remove);

  /** Removes the tag being edited, once its text has been emptied. Focus stays where it is, or went. */
  const removeEdited = () => {
    setEditing(null);
    remove(editAt, false);
  };

  const changeText = (next: string) => {
    setRefusal(null);
    // Only a delimiter just typed ends tags: text left in the input after a refusal stays as it is until then.
    const added = insertedText(text, next);
    const typed = delimiters.some((delimiter) => delimiter !== '' && added.includes(delimiter))
      ? splitTyped(next, delimiters)
      : null;
    setText(typed === null ? next : commit(typed.finished, typed.rest));
  };

  /** Adds the typed text, split at the delimiters (Enter or leaving the field); false when there's nothing to add. */
  const commitText = (): boolean => {
    if (isLocked) {
      return false;
    }
    const parts = splitPasted(text, delimiters);
    if (parts.length === 0) {
      if (editAt < 0) {
        return false;
      }
      removeEdited();
      setText('');
      return true;
    }
    setText(commit(parts));
    return true;
  };

  const leave = () => {
    if (text.trim() === '' && editAt < 0) {
      return;
    }
    commitText();
    // A list-only field keeps no unmatched text once it's left, as a combo box puts its text back.
    if (isRestricted) {
      setText('');
      setEditing(null);
    }
  };

  /** Escape: the tag being edited goes back as it was. False when nothing was being edited. */
  const cancelEdit = (): boolean => {
    if (editAt < 0) {
      return false;
    }
    setEditing(null);
    setText('');
    setRefusal(null);
    return true;
  };

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    const parts = splitPasted(pasted, delimiters);
    if (isLocked || (parts.length < 2 && !/[\n\r]/.test(pasted))) {
      return;
    }
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    setText(
      commit(
        splitPasted(input.value.slice(0, start) + pasted + input.value.slice(end), delimiters),
      ),
    );
  };

  /** Puts a tag's text in the input to edit. The tag stays in the value until the edit is put back. */
  const edit = (index: number) => {
    const tag = tags[index];
    if (tag === undefined || isLocked) {
      return;
    }
    setEditing({ index, tag });
    setText(tag);
    setRefusal(null);
    announce(messages.tagEditing({ tag }));
    localInputRef.current?.focus();
  };

  /** Backspace in the empty input: removes the emptied tag being edited, or edits the last tag. */
  const backspace = (): boolean => {
    if (text !== '' || isLocked) {
      return false;
    }
    if (editAt >= 0) {
      removeEdited();
      return true;
    }
    if (tags.length === 0) {
      return false;
    }
    edit(tags.length - 1);
    return true;
  };

  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: !canReorder,
    getItems: (keys) =>
      [...keys].map((key) => ({
        'text/plain': tokens.find((token) => token.id === key)?.tag ?? String(key),
      })),
    onReorder: (event) => {
      const next = moveIdsTo(tokens, dropMove(event.target, event.keys), (token) => token.id);
      setTags(next.map((token) => token.tag));
      const position = next.findIndex((token) => event.keys.has(token.id));
      const moved = next[position];
      if (moved) {
        announce(
          messages.itemMovedTo({ item: moved.tag, position: position + 1, total: next.length }),
        );
      }
    },
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        // Net zero width with the list's gap, so showing the indicators doesn't move the tags.
        className="-mx-[3px] h-6 w-0.5 rounded-full data-drop-target:bg-accent-solid"
      />
    ),
  });

  const problems =
    invalidTokens.length > 0 ? (
      <span className="flex flex-col">
        {invalidTokens.map((token) => (
          <span key={token.id}>
            {messages.tagProblem({ tag: token.tag, message: token.problem ?? '' })}
          </span>
        ))}
      </span>
    ) : undefined;
  // The app's message (while it marks the field invalid), then each invalid tag's message.
  const shownErrorMessage =
    problems === undefined ? (
      errorMessage
    ) : (
      <>
        {isInvalid && typeof errorMessage !== 'function' && errorMessage}
        {problems}
      </>
    );

  const frame = (
    <FieldFrame
      label={label !== undefined ? <span id={labelId}>{label}</span> : undefined}
      description={description}
      errorMessage={shownErrorMessage}
      labelPosition={labelPosition}
      infoTip={infoTip}
      isRequired={isRequired}
    >
      <div
        ref={groupRef}
        // Keys on a focused tag: Delete or Backspace removes it, Enter takes it back into the input to edit.
        onKeyDownCapture={(event) => {
          const row = event.target as HTMLElement;
          const index = row.dataset.tagIndex;
          if (index === undefined || isLocked) {
            return;
          }
          if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            event.stopPropagation();
            remove(Number(index));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            edit(Number(index));
          }
        }}
        className={cn(
          inputGroupClasses,
          chipGroupClasses[size],
          // A long tag's remove button can reach the box's edge, and its touch area past it: clip that sideways, so
          // it can't widen the page. The end padding (without the list button) leaves room for focus rings.
          'overflow-x-clip',
          !hasListButton && 'pe-1.5',
        )}
      >
        {shownTokens.length > 0 && (
          <GridList
            // GridList calls its drag-and-drop hooks only while it has them, so turning them on or off remounts it.
            key={canReorder ? 'reorderable' : 'fixed'}
            aria-labelledby={label !== undefined ? labelId : undefined}
            aria-label={label === undefined ? ariaLabel : undefined}
            items={shownTokens}
            layout="grid"
            dragAndDropHooks={canReorder ? dragAndDropHooks : undefined}
            disabledKeys={isDisabled ? shownTokens.map((token) => token.id) : undefined}
            dependencies={[isLocked, canReorder, messages]}
            className="flex max-w-full min-w-0 flex-wrap gap-1 outline-none"
          >
            {(token) => (
              <GridListItem
                id={token.id}
                textValue={token.tag}
                data-tag-index={token.index}
                className={cn(
                  'relative inline-flex max-w-full rounded-full outline-none',
                  'data-focus-visible:focus-ring data-dragging:opacity-50',
                  canReorder && 'cursor-grab',
                )}
              >
                {canReorder && (
                  // The keyboard and screen reader drag handle, covering the tag: pointers drag the whole tag. Focused,
                  // it tints the tag as well as ringing it, unlike the tag's own focus.
                  <AriaButton
                    slot="drag"
                    aria-label={messages.dragItem({ item: token.tag })}
                    className="absolute inset-0 rounded-full outline-none data-focus-visible:bg-current/15 data-focus-visible:focus-ring"
                  />
                )}
                <Chip
                  size="sm"
                  tone={token.problem === undefined ? 'neutral' : 'danger'}
                  icon={token.problem === undefined ? undefined : CircleAlert}
                  onRemove={
                    isLocked
                      ? undefined
                      : () => {
                          latestRemove.current(token.index);
                        }
                  }
                >
                  {token.tag}
                </Chip>
                {/* Always there, empty for a valid tag: React Aria links a row's description only if it exists when
                    the row mounts, and a tag can turn invalid later. */}
                <Text slot="description" className="sr-only">
                  {token.problem}
                </Text>
              </GridListItem>
            )}
          </GridList>
        )}
        <TagInput
          localRef={localInputRef}
          inputRef={inputRef}
          placeholder={tags.length === 0 ? placeholder : undefined}
          onCommit={commitText}
          onBackspace={backspace}
          onCancel={cancelEdit}
          onPaste={paste}
          // Leaving the field adds what was typed.
          onBlur={leave}
        />
        {hasListButton && (
          <AriaButton className={inputButtonClasses}>
            <ChevronDown aria-hidden="true" className="size-4" />
          </AriaButton>
        )}
      </div>
      <PlainFieldError id={refusalId}>{refusal ?? undefined}</PlainFieldError>
    </FieldFrame>
  );

  const rootProps = {
    ref,
    isDisabled,
    isReadOnly,
    // Required means at least one tag: the input itself may be empty once there are tags.
    isRequired: isRequired && tags.length === 0,
    isInvalid: isInvalid || invalidTokens.length > 0,
    'aria-label': ariaLabel,
    'aria-describedby': joinIds(ariaDescribedBy, refusal !== null && refusalId),
    className: fieldRootClasses(className),
  };
  const announcer = (
    // While a combo box list is open, React Aria hides everything else from assistive technology except live
    // announcers, which it finds by this attribute.
    <span data-live-announcer="true">
      <LiveRegion ref={announcerRef} />
    </span>
  );

  if (!suggestions) {
    return (
      <AriaTextField {...rootProps} value={text} onChange={changeText}>
        {frame}
        {announcer}
      </AriaTextField>
    );
  }
  return (
    <AriaComboBox
      {...rootProps}
      items={shownSuggestions}
      value={null}
      onChange={(key: Key | null) => {
        if (key !== null && !isLocked) {
          setText(commit([String(key)]));
        }
      }}
      inputValue={text}
      onInputChange={changeText}
      // The typed text is always kept; restricting tags to the list is the field's own rule.
      allowsCustomValue
      allowsEmptyCollection={!allowsCustomValue}
    >
      <InComboBoxTree>
        {frame}
        {announcer}
      </InComboBoxTree>
      <AriaPopover className={cn('max-h-[50vh]', popoverClasses)}>
        <ListBox<SuggestionItem>
          className={listBoxClasses}
          renderEmptyState={() => <ListBoxEmpty>{messages.noResults}</ListBoxEmpty>}
        >
          {(item) => <Option id={item.id}>{item.id}</Option>}
        </ListBox>
      </AriaPopover>
    </AriaComboBox>
  );
}

/**
 * Renders its children only in the combo box's own tree. React Aria first renders a combo box's children in a hidden
 * copy, to collect the list's items; there the tags' grid would add its rows to the list, and refs would point into
 * the copy. The copy has no combo box state, which tells the two apart.
 */
function InComboBoxTree({ children }: { children: ReactNode }): ReactNode {
  return useContext(ComboBoxStateContext) === null ? null : children;
}

/** A `validateTag` result as a message, or `undefined` for a valid tag. */
function problemOf(result: string | null | undefined): string | undefined {
  return result === null || result === '' ? undefined : result;
}

/** The text input. Inside a combo box, Enter on a highlighted suggestion is left to React Aria to choose it. */
function TagInput({
  localRef,
  inputRef,
  placeholder,
  onCommit,
  onBackspace,
  onCancel,
  onPaste,
  onBlur,
}: {
  localRef: Ref<HTMLInputElement>;
  inputRef: Ref<HTMLInputElement> | undefined;
  placeholder: string | undefined;
  onCommit: () => boolean;
  onBackspace: () => boolean;
  onCancel: () => boolean;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}): ReactNode {
  const combo = useContext(ComboBoxStateContext);
  return (
    <Input
      ref={mergeRefs(localRef, inputRef)}
      placeholder={placeholder}
      autoComplete="off"
      onKeyDownCapture={(event) => {
        if (event.nativeEvent.isComposing) {
          return;
        }
        // An open list closes first; Escape after that cancels an edit (and goes no further, so a dialog stays open).
        if (event.key === 'Escape' && !combo?.isOpen && onCancel()) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (event.key !== 'Enter') {
          return;
        }
        if (combo?.isOpen && combo.selectionManager.focusedKey !== null) {
          return;
        }
        if (onCommit()) {
          // The tag is added: no form submit, and React Aria needn't commit its own value.
          event.preventDefault();
          event.stopPropagation();
          combo?.close();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Backspace' && onBackspace()) {
          event.preventDefault();
        }
      }}
      onPaste={onPaste}
      onBlur={onBlur}
      className={chipInputClasses}
    />
  );
}
