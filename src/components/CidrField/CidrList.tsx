// CidrList: an allowlist of IPv4/IPv6 blocks. Each entry is a CidrField, editable in place; pasting many lines into
// the add field adds them all. Duplicates and overlaps are flagged on both entries, and overlapping, duplicate and
// adjacent blocks can be merged on request (two /25s become a /24).
import { Merge, Plus, Trash2 } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import { Button } from '../Button/Button';
import type { FieldBaseProps } from '../Field/Field';
import { IconButton } from '../IconButton/IconButton';
import { TextField } from '../TextField/TextField';
import { useEntryMessages } from '../../provider/context';
import { parseCidr, summarizeCidrs, type CidrFamily } from './cidr';
import { CidrField } from './CidrField';
import { checkCidrEntries, splitCidrText, type CidrEntryIssue } from './cidrChecks';
import { defaultCidrFieldMessages, type CidrFieldMessages } from './messages';

export interface CidrListProps extends Omit<FieldBaseProps, 'labelPosition' | 'infoTip'> {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (cidrs: string[]) => void;
  /** Which families are accepted. Defaults to `both`. */
  family?: CidrFamily;
  /** Accepts bare addresses as /32 or /128. Defaults to true. */
  allowsHost?: boolean;
  /**
   * Flags overlaps and duplicates on the entries and offers to merge overlapping and adjacent ranges. Defaults to
   * true.
   */
  shouldCheckOverlaps?: boolean;
  /** The most entries the list takes. */
  maxItems?: number;
  /** Shows each entry's range and address count. Defaults to true. */
  hasRangeInfo?: boolean;
  /** Marks the list invalid, showing `errorMessage` under it. */
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Names the list when there's no visible label. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface KeyState {
  entries: readonly string[];
  keys: number[];
  next: number;
}

const emptyKeys: KeyState = { entries: [], keys: [], next: 0 };

/** Keys for `entries`: the existing ones by position, and new ones for added entries. */
function fitKeys(state: KeyState, entries: readonly string[]): KeyState {
  const keys = state.keys.slice(0, entries.length);
  let next = state.next;
  while (keys.length < entries.length) {
    keys.push(next++);
  }
  return { entries, keys, next };
}

function issueText(issue: CidrEntryIssue, messages: CidrFieldMessages): string {
  switch (issue.kind) {
    case 'duplicate':
      return messages.cidrDuplicate({ other: issue.other });
    case 'coveredBy':
      return messages.cidrCoveredBy({ other: issue.other });
    case 'covers':
      return messages.cidrCovers({ other: issue.other });
  }
}

/** A list of CIDR blocks with paste-to-add, overlap and duplicate warnings, and merging. */
export function CidrList({
  label,
  description,
  errorMessage,
  value,
  defaultValue = [],
  onChange,
  family = 'both',
  allowsHost = true,
  shouldCheckOverlaps = true,
  maxItems,
  hasRangeInfo = true,
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  'aria-label': ariaLabel,
  className,
  ref,
}: CidrListProps) {
  const messages = useEntryMessages(defaultCidrFieldMessages);
  const labelId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const [entries, setEntries] = useControllableState<readonly string[]>(
    value,
    defaultValue,
    onChange as ((next: readonly string[]) => void) | undefined,
  );
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  /** After a removal, the entry index to focus (or -1 for the add field). */
  const pendingFocus = useRef<number | null>(null);

  // Stable keys for the entries, so editing state stays with its entry when others are removed. Kept in step with
  // the entries during render when they change from outside (React's "adjust state on prop change" pattern).
  const [keyState, setKeyState] = useState(() => fitKeys(emptyKeys, entries));
  let keys = keyState;
  if (keyState.entries !== entries) {
    keys = fitKeys(keyState, entries);
    setKeyState(keys);
  }

  const check = checkCidrEntries(entries, family, shouldCheckOverlaps);
  const validTexts = check.entries.flatMap((entry) =>
    entry.result.isValid ? [entry.result.cidr.text] : [],
  );
  const merged = shouldCheckOverlaps ? summarizeCidrs(validTexts) : validTexts;
  const canMerge = merged.length < validTexts.length;
  const isFull = maxItems !== undefined && entries.length >= maxItems;
  const isLocked = isDisabled || isReadOnly;

  const commit = (next: string[]) => {
    setEntries(next);
  };

  const addTexts = (texts: readonly string[]) => {
    if (texts.length === 0) {
      return;
    }
    const room = maxItems === undefined ? texts.length : Math.max(0, maxItems - entries.length);
    const accepted = texts.slice(0, room);
    let normalized = 0;
    let invalid = 0;
    const added = accepted.map((text) => {
      const result = parseCidr(text, { family, allowsHost });
      if (!result.isValid) {
        invalid++;
        return text;
      }
      if (result.cidr.text !== text) {
        normalized++;
      }
      return result.cidr.text;
    });
    commit([...entries, ...added]);
    setDraft('');
    const skipped = texts.length - accepted.length;
    setAnnouncement(
      skipped > 0 && maxItems !== undefined
        ? messages.cidrListTooMany({ added: added.length, skipped, max: maxItems })
        : messages.cidrListAdded({ count: added.length, normalized, invalid }),
    );
  };

  const remove = (index: number) => {
    const removed = entries[index] ?? '';
    const next = entries.filter((_, at) => at !== index);
    setKeyState({ ...keys, entries: next, keys: keys.keys.filter((_, at) => at !== index) });
    commit(next);
    setAnnouncement(messages.cidrListRemoved({ cidr: removed }));
    pendingFocus.current = next.length === 0 ? -1 : Math.min(index, next.length - 1);
  };

  const merge = () => {
    const invalidEntries = entries.filter((_, index) => !check.entries[index]?.result.isValid);
    const next = [...merged, ...invalidEntries];
    // Merged entries are new entries: fresh keys.
    setKeyState(fitKeys({ ...keys, keys: [] }, next));
    commit(next);
    setAnnouncement(messages.cidrListMerged({ from: validTexts.length, to: merged.length }));
  };

  // After a removal, focus the entry that took its place (or the add field when the list is empty).
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === null) {
      return;
    }
    pendingFocus.current = null;
    if (target < 0) {
      addInputRef.current?.focus();
      return;
    }
    rootRef.current?.querySelectorAll<HTMLInputElement>('[data-cidr-entry] input')[target]?.focus();
  }, [entries]);

  const showAppError =
    isInvalid && errorMessage !== undefined && typeof errorMessage !== 'function';
  const summary =
    entries.length > 0
      ? messages.cidrListSummary({
          count: entries.length,
          overlaps: check.overlapCount,
          duplicates: check.duplicateCount,
          invalid: check.invalidCount,
        })
      : undefined;

  return (
    <div
      ref={mergeRefs(rootRef, ref)}
      role="group"
      aria-labelledby={label !== undefined ? labelId : undefined}
      aria-label={label === undefined ? ariaLabel : undefined}
      aria-describedby={
        [
          description !== undefined ? descriptionId : undefined,
          showAppError ? `${descriptionId}-error` : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined
      }
      className={cn('relative flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium">
          {label}
        </span>
      )}
      {description !== undefined && (
        <span id={descriptionId} className="-mt-2 text-xs text-fg-muted">
          {description}
        </span>
      )}
      {summary !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-fg-muted">{summary}</span>
          {canMerge && !isLocked && (
            <Button variant="outline" size="sm" icon={Merge} onPress={merge}>
              {messages.cidrMerge({ from: validTexts.length, to: merged.length })}
            </Button>
          )}
        </div>
      )}
      {entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => {
            const entryCheck = check.entries[index];
            const issues = entryCheck?.issues ?? [];
            const name = messages.cidrEntry({ index: index + 1 });
            const shown = entryCheck?.result.isValid ? entryCheck.result.cidr.text : entry;
            return (
              <li
                key={keys.keys[index]}
                data-cidr-entry=""
                className="flex min-w-0 items-start gap-1"
              >
                <CidrField
                  aria-label={name}
                  value={entry}
                  onChange={(next) => {
                    commit(entries.map((item, at) => (at === index ? next : item)));
                  }}
                  family={family}
                  allowsHost={allowsHost}
                  hasRangeInfo={hasRangeInfo}
                  warningMessage={
                    issues.length > 0 ? (
                      <span className="flex flex-col">
                        {issues.map((issue) => (
                          <span key={`${issue.kind}-${String(issue.otherIndex)}`}>
                            {issueText(issue, messages)}
                          </span>
                        ))}
                      </span>
                    ) : undefined
                  }
                  isDisabled={isDisabled}
                  isReadOnly={isReadOnly}
                  className="flex-1"
                />
                {!isLocked && (
                  <IconButton
                    icon={Trash2}
                    aria-label={messages.cidrRemove({ cidr: shown === '' ? name : shown })}
                    onPress={() => {
                      remove(index);
                    }}
                    className="pointer-coarse:mt-0.5"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!isReadOnly && (
        <div
          className="flex min-w-0 flex-col gap-1.5"
          onPaste={(event) => {
            const texts = splitCidrText(event.clipboardData.getData('text'));
            if (texts.length > 1) {
              event.preventDefault();
              addTexts(texts);
            }
          }}
        >
          <div className="flex min-w-0 items-end gap-2">
            <TextField
              label={messages.cidrListAddLabel}
              aria-describedby={hintId}
              value={draft}
              onChange={setDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTexts(splitCidrText(draft));
                }
              }}
              placeholder={messages.cidrPlaceholder({ family })}
              autoComplete="off"
              isDisabled={isDisabled || isFull}
              inputRef={addInputRef}
              className="min-w-0 flex-1"
            />
            <Button
              variant="outline"
              icon={Plus}
              onPress={() => {
                addTexts(splitCidrText(draft));
              }}
              isDisabled={isDisabled || isFull || draft.trim() === ''}
            >
              {messages.cidrListAdd}
            </Button>
          </div>
          <span id={hintId} className="flex flex-col text-xs text-fg-muted">
            <span>{messages.cidrListAddHint}</span>
            {maxItems !== undefined && <span>{messages.cidrListMax({ max: maxItems })}</span>}
          </span>
        </div>
      )}
      {showAppError && (
        <p id={`${descriptionId}-error`} className="text-xs font-medium text-danger-fg">
          {errorMessage}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
