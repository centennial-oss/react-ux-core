import { Search, X } from 'lucide-react';
import { useId, useRef, type Ref } from 'react';
import {
  Button as AriaButton,
  Input,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useDebouncedCallback } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import {
  FieldFrame,
  fieldRootClasses,
  inputButtonClasses,
  inputClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { Kbd } from '../Kbd/Kbd';
import { useSlashShortcut } from './useSlashShortcut';

export interface SearchFieldProps
  extends
    Omit<AriaSearchFieldProps, 'className' | 'style' | 'children' | 'render' | 'type'>,
    FieldBaseProps {
  placeholder?: string;
  /**
   * Called with the query once typing pauses for `searchDelay` ms, for live results. Enter runs it straight away,
   * and clearing (the clear button or Escape) runs it straight away with `''`. `onChange` still fires on every
   * keystroke.
   */
  onSearch?: (value: string) => void;
  /** How long typing must pause before `onSearch` runs, in milliseconds. Defaults to 300. */
  searchDelay?: number;
  /**
   * Pressing "/" anywhere on the page (outside other text fields) focuses this field. A "/" key hint shows while
   * the field is empty and unfocused, on devices with a fine pointer.
   */
  hasShortcut?: boolean;
  /** Defaults to `md`. On touch screens the height grows to the minimum touch target. */
  size?: 'sm' | 'md';
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
  /** The input element. */
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * A search input with a clear button. Escape clears it (and, when already empty, passes through, for example to
 * close a dialog). `onChange` reports every keystroke; `onSearch` is debounced for live results.
 */
export function SearchField({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  placeholder,
  onSearch,
  searchDelay = 300,
  hasShortcut = false,
  size = 'md',
  className,
  inputRef,
  value: valueProp,
  defaultValue,
  onChange,
  onSubmit,
  onClear,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: SearchFieldProps) {
  const messages = useMessages();
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const hintId = useId();
  const search = useDebouncedCallback((query: string) => {
    onSearch?.(query);
  }, searchDelay);
  const isShortcutOn = hasShortcut && rest.isDisabled !== true;
  useSlashShortcut(localInputRef, isShortcutOn);

  const searchNow = (query: string) => {
    search.cancel();
    onSearch?.(query);
  };

  return (
    <AriaSearchField
      // A search key on the on-screen keyboard, and no browser autofill list over the app's own results; props
      // override these.
      inputMode="search"
      enterKeyHint="search"
      autoComplete="off"
      {...rest}
      aria-describedby={
        [ariaDescribedBy, isShortcutOn ? hintId : undefined].filter(Boolean).join(' ') || undefined
      }
      value={value}
      onChange={(next) => {
        setValue(next);
        if (onSearch) {
          search.run(next);
        }
      }}
      // Only take over Enter when something listens, so a search field inside a form still submits it.
      onSubmit={
        onSearch || onSubmit
          ? (query) => {
              searchNow(query);
              onSubmit?.(query);
            }
          : undefined
      }
      onClear={() => {
        // React Aria has already reported '' through onChange; search for it now rather than after the delay.
        searchNow('');
        onClear?.();
      }}
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
        <div className={cn(inputGroupClasses, inputHeightClasses[size])}>
          <Search aria-hidden="true" className="ms-3 size-4 shrink-0 text-fg-muted" />
          <Input
            ref={mergeRefs(localInputRef, inputRef)}
            placeholder={placeholder}
            aria-keyshortcuts={isShortcutOn ? '/' : undefined}
            className={cn(
              inputClasses,
              // The browser's own clear button would duplicate ours.
              'peer ps-2 [&::-webkit-search-cancel-button]:appearance-none',
            )}
          />
          {isShortcutOn && value === '' && (
            <Kbd
              aria-hidden="true"
              className="me-3 shrink-0 peer-focus:hidden pointer-coarse:hidden"
            >
              /
            </Kbd>
          )}
          {value !== '' && rest.isReadOnly !== true && (
            <AriaButton aria-label={messages.clearValue} className={inputButtonClasses}>
              <X aria-hidden="true" className="size-4" />
            </AriaButton>
          )}
        </div>
        {isShortcutOn && (
          <span id={hintId} hidden>
            {messages.searchShortcutHint}
          </span>
        )}
      </FieldFrame>
    </AriaSearchField>
  );
}
