// TemplateEditor: a text-message template with {{keyword}} placeholders. Typing "{{" offers the keywords under the
// text, and choosing one inserts it at the caret; a live example fills the keywords in, a counter shows the length
// in SMS parts, and a Keywords section lists them all (with Insert buttons for touch screens).
//
// Keyboard: while suggestions show, Up and Down choose, Enter or Tab inserts, Escape closes them. The text area keeps
// focus throughout (the list is announced through aria-activedescendant and a polite live region).
import { Plus } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { TextArea, TextField } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import type { TemplateEditorMessages } from '../../provider/messages';
import { cn } from '../../utils/cn';
import { clamp } from '../../utils/math';
import { useControllableState } from '../../utils/useControllableState';
import { Button } from '../Button/Button';
import { Disclosure } from '../Disclosure/Disclosure';
import {
  FieldFrame,
  fieldRootClasses,
  inputClasses,
  inputGroupClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { LiveRegion } from '../LiveRegion/LiveRegion';
import { useAutoGrow } from '../TextArea/useAutoGrow';
import {
  findTrigger,
  renderTemplate,
  sameTrigger,
  smsParts,
  type TemplateEditorKeyword,
  type Trigger,
} from './template';

/** English defaults of TemplateEditor's strings (see `Messages`). */
export const defaultTemplateEditorMessages: TemplateEditorMessages = {
  templateExample: 'Example',
  templateEmptyExample: 'The message, with sample values, appears here as you type.',
  templateKeywords: 'Keywords',
  templateKeywordsHint: 'Type {{ in the message to pick one, or insert it here.',
  insertKeyword: 'Insert',
  insertKeywordLabel: ({ keyword }) => `Insert {{${keyword}}}`,
  keywordExample: ({ example }) => `Example: ${example}`,
  smsCount: ({ characters, limit, parts }) =>
    `${characters} of ${limit} characters with the sample values · ${parts} SMS`,
  keywordSuggestions: ({ count }) =>
    `${count} ${count === 1 ? 'keyword' : 'keywords'}. Up and down arrows to choose, Enter to insert, Escape to close.`,
};

export interface TemplateEditorProps extends FieldBaseProps {
  /** The template text. Controlled. */
  value?: string;
  /** The initial text, uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  /** The keywords this template may use. */
  keywords: readonly TemplateEditorKeyword[];
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** The form field name. */
  name?: string;
  /** Names the editor when there's no visible `label`. */
  'aria-label'?: string;
  placeholder?: string;
  /** Lines shown when empty or short. Defaults to 3. */
  minRows?: number;
  /** Lines before the message scrolls inside instead of growing. Defaults to 10. */
  maxRows?: number;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

/** An SMS template with keyword suggestions, a live example, an SMS counter and a keyword list. */
export function TemplateEditor({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  value: valueProp,
  defaultValue,
  onChange,
  onBlur,
  keywords,
  isInvalid = false,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  name,
  'aria-label': ariaLabel,
  placeholder,
  minRows = 3,
  maxRows = 10,
  className,
  ref,
}: TemplateEditorProps) {
  const messages = useEntryMessages(defaultTemplateEditorMessages);
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** The last caret or selection in the text area, for the Insert buttons (which take focus). */
  const selection = useRef({ start: value.length, end: value.length });
  /** Where to put the caret once the edited value is back in the text area. */
  const pendingCaret = useRef<number | null>(null);
  const listId = useId();
  const countId = useId();
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useAutoGrow(textareaRef, frameRef, value, minRows, maxRows);

  const isEditable = !isDisabled && !isReadOnly;
  const matches = useMemo(() => {
    if (!trigger) {
      return [];
    }
    const query = trigger.query.toLowerCase();
    const starts = (k: TemplateEditorKeyword) => k.keyword.toLowerCase().startsWith(query);
    return keywords
      .filter((k) => k.keyword.toLowerCase().includes(query))
      .sort((a, b) => Number(starts(b)) - Number(starts(a)));
  }, [trigger, keywords]);
  const isOpen =
    isEditable && trigger !== null && dismissedAt !== trigger.start && matches.length > 0;
  const active = clamp(activeIndex, 0, Math.max(matches.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${String(index)}`;

  const rendered = useMemo(() => renderTemplate(value, keywords), [value, keywords]);
  const characters = rendered.length;
  const parts = smsParts(characters);
  const limit = parts <= 1 ? 160 : parts * 153;

  // Put the caret after an inserted keyword once the new value is in the text area.
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

  // Keep the chosen suggestion in view.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, active]);

  /** Reads the caret from the text area (its value is current even before the next render). */
  const syncCaret = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    selection.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
    const next =
      textarea.selectionStart === textarea.selectionEnd
        ? findTrigger(textarea.value, textarea.selectionStart)
        : null;
    if (!sameTrigger(trigger, next)) {
      setTrigger(next);
      setActiveIndex(0);
      if (!next) {
        setDismissedAt(null);
      }
    }
  };

  const insert = (keyword: string) => {
    const text = textareaRef.current?.value ?? value;
    const placeholderText = `{{${keyword}}}`;
    let start: number;
    let end: number;
    if (isOpen) {
      // Replace the "{{query" being typed, and a "}}" already after the caret.
      start = trigger.start;
      end = trigger.start + 2 + trigger.query.length;
      if (text.startsWith('}}', end)) {
        end += 2;
      }
    } else {
      start = Math.min(selection.current.start, text.length);
      end = Math.min(selection.current.end, text.length);
    }
    const next = text.slice(0, start) + placeholderText + text.slice(end);
    const caret = start + placeholderText.length;
    setTrigger(null);
    if (next === text) {
      // Nothing changed (the keyword was already complete): just move the caret past it.
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
      selection.current = { start: caret, end: caret };
      return;
    }
    pendingCaret.current = caret;
    setValue(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((active + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((active - 1 + matches.length) % matches.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      const choice = matches[active];
      if (!choice) {
        return;
      }
      event.preventDefault();
      insert(choice.keyword);
    } else if (event.key === 'Escape') {
      // Close the suggestions only; don't let a surrounding dialog close too.
      event.preventDefault();
      event.stopPropagation();
      setDismissedAt(trigger.start);
    }
  };

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-3', className)}>
      <TextField
        name={name}
        aria-label={ariaLabel}
        value={value}
        onChange={(text) => {
          setValue(text);
          syncCaret();
        }}
        onBlur={() => {
          setTrigger(null);
          onBlur?.();
        }}
        isInvalid={isInvalid}
        isRequired={isRequired}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        validationBehavior="aria"
        aria-describedby={countId}
        className={fieldRootClasses()}
      >
        <FieldFrame
          label={label}
          description={description}
          errorMessage={errorMessage}
          labelPosition={labelPosition}
          infoTip={infoTip}
          isRequired={isRequired}
        >
          <div ref={frameRef} className={cn(inputGroupClasses, 'items-stretch')}>
            <TextArea
              ref={textareaRef}
              rows={minRows}
              placeholder={placeholder}
              aria-autocomplete="list"
              aria-controls={isOpen ? listId : undefined}
              aria-activedescendant={isOpen ? optionId(active) : undefined}
              onKeyDown={onKeyDown}
              onSelect={syncCaret}
              onClick={syncCaret}
              className={cn(inputClasses, 'h-auto resize-none py-2')}
            />
          </div>
          {isOpen && (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={messages.templateKeywords}
              className="flex max-h-56 flex-col gap-0.5 overflow-auto rounded-card border border-border bg-surface-2 p-1 shadow-overlay"
            >
              {matches.map((k, index) => (
                // The text area keeps focus and handles the keyboard (aria-activedescendant); the pointer can pick too.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={k.keyword}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  tabIndex={-1}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    insert(k.keyword);
                  }}
                  className={cn(
                    'flex min-h-hit cursor-pointer flex-col justify-center rounded-control px-2 py-1.5 text-fg',
                    'hover:bg-surface-3',
                    index === active && 'bg-surface-3',
                  )}
                >
                  <span className="font-mono text-sm">{`{{${k.keyword}}}`}</span>
                  <span className="text-xs text-fg-muted">
                    {k.description} · {k.example}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <LiveRegion>
            {isOpen ? messages.keywordSuggestions({ count: matches.length }) : ''}
          </LiveRegion>
          <span
            id={countId}
            className={cn(
              'self-end text-end text-xs tabular-nums',
              parts > 1 ? 'text-warning-fg' : 'text-fg-muted',
            )}
          >
            {messages.smsCount({ characters, limit, parts })}
          </span>
        </FieldFrame>
      </TextField>

      <div className="flex min-w-0 flex-col gap-1 rounded-control border border-border bg-surface-1 px-3 py-2">
        <span className="text-xs font-medium text-fg-muted">{messages.templateExample}</span>
        <p
          className={cn(
            'text-sm break-words whitespace-pre-wrap',
            rendered ? 'text-fg' : 'text-fg-muted',
          )}
        >
          {rendered || messages.templateEmptyExample}
        </p>
      </div>

      {keywords.length > 0 && (
        <Disclosure title={messages.templateKeywords} headingLevel={4}>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-xs text-fg-muted">{messages.templateKeywordsHint}</p>
            <ul className="flex min-w-0 flex-col divide-y divide-border">
              {keywords.map((k) => (
                <li key={k.keyword} className="flex min-w-0 items-start justify-between gap-3 py-2">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <code className="font-mono text-sm break-all text-fg">{`{{${k.keyword}}}`}</code>
                    <span className="text-xs text-fg-muted">{k.description}</span>
                    <span className="text-xs text-fg-muted">
                      {messages.keywordExample({ example: k.example })}
                    </span>
                  </span>
                  {isEditable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Plus}
                      aria-label={messages.insertKeywordLabel({ keyword: k.keyword })}
                      onPress={() => {
                        insert(k.keyword);
                      }}
                    >
                      {messages.insertKeyword}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Disclosure>
      )}
    </div>
  );
}
