import { ChevronDown } from 'lucide-react';
import { useState, type ReactElement, type Ref } from 'react';
import {
  Button as AriaButton,
  ButtonContext,
  ComboBox as AriaComboBox,
  Group,
  Input,
  ListBox,
  Popover as AriaPopover,
  useAsyncList,
  type Key,
} from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useDebouncedCallback } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
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
import { ListBoxEmpty, listBoxClasses } from '../ListBox/ListBoxParts';
import { popoverClasses } from '../Overlay/styles';
import { SpinnerIcon } from '../Spinner/SpinnerIcon';

/** Items need a stable `id`. */
export interface MultiSelectItem {
  id: Key;
}

interface BaseMultiSelectProps<T extends MultiSelectItem> extends FieldBaseProps {
  /** Static items, filtered as the user types. */
  items?: Iterable<T>;
  /** Loads items for the typed text instead of `items` (debounced; stale requests are aborted). */
  loadItems?: (query: string, signal: AbortSignal) => Promise<Iterable<T>>;
  /** Debounce for `loadItems`, in milliseconds. Defaults to 300. */
  loadDelay?: number;
  /** Renders an `Option` for each item. */
  children: (item: T) => ReactElement;
  /** The chip label for an item. Defaults to its `label`, `name` or `title`, or its id. */
  getItemLabel?: (item: T) => string;
  /** The chosen items' ids. */
  value?: readonly Key[];
  defaultValue?: readonly Key[];
  onChange?: (value: Key[]) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  'aria-label'?: string;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

function defaultLabel(item: MultiSelectItem): string {
  const record = item as unknown as Record<string, unknown>;
  for (const field of ['label', 'name', 'title']) {
    if (typeof record[field] === 'string') {
      return record[field];
    }
  }
  return String(item.id);
}

/** `T` is the item type; `K` the ids' type, inferred from `value` or `onChange` (ids must come from that union). */
export interface MultiSelectProps<
  T extends MultiSelectItem = MultiSelectItem,
  K extends Key = Key,
> extends Omit<BaseMultiSelectProps<T>, 'value' | 'defaultValue' | 'onChange'> {
  /** The chosen items' ids, controlled. */
  value?: readonly K[];
  /** The initially chosen items' ids, uncontrolled. They don't widen the id type. */
  defaultValue?: readonly NoInfer<K>[];
  onChange?: (value: K[]) => void;
}

/**
 * Choose several options; the chosen values show as removable chips and drop out of the suggestions. Static
 * `items` are filtered as you type, or `loadItems` fetches results. Backspace in the empty input removes the last
 * chip.
 *
 * Built on React Aria's single-selection combo box: each pick adds a chip and clears the query.
 */
export function MultiSelect<T extends MultiSelectItem = MultiSelectItem, K extends Key = Key>(
  typedProps: MultiSelectProps<T, K>,
) {
  // The ids React Aria reports are always the items' ids, which the caller typed as K.
  const props = typedProps as unknown as BaseMultiSelectProps<T>;
  if (props.loadItems) {
    return <AsyncMultiSelect {...props} loadItems={props.loadItems} />;
  }
  return <MultiSelectShell {...props} staticItems={props.items} isLoading={false} />;
}

function AsyncMultiSelect<T extends MultiSelectItem>(
  props: BaseMultiSelectProps<T> & { loadItems: NonNullable<BaseMultiSelectProps<T>['loadItems']> },
) {
  const { loadItems, loadDelay = 300 } = props;
  const list = useAsyncList<T>({
    async load({ signal, filterText }) {
      return { items: [...(await loadItems(filterText ?? '', signal))] };
    },
  });
  const search = useDebouncedCallback((text: string) => {
    list.setFilterText(text);
  }, loadDelay);
  const isLoading = list.loadingState === 'loading' || list.loadingState === 'filtering';
  return (
    <MultiSelectShell
      {...props}
      asyncItems={list.items}
      onSearch={search.run}
      isLoading={isLoading}
      loadError={list.error}
    />
  );
}

interface ShellProps<T extends MultiSelectItem> extends BaseMultiSelectProps<T> {
  staticItems?: Iterable<T>;
  asyncItems?: Iterable<T>;
  onSearch?: (text: string) => void;
  isLoading: boolean;
  loadError?: Error;
}

function MultiSelectShell<T extends MultiSelectItem>(props: ShellProps<T>) {
  const {
    children,
    getItemLabel = defaultLabel,
    value: valueProp,
    defaultValue,
    onChange,
    placeholder,
    isDisabled,
    isRequired,
    isInvalid,
    'aria-label': ariaLabel,
    size = 'md',
    className,
    ref,
    staticItems,
    asyncItems,
    onSearch,
    isLoading,
    loadError,
  } = props;
  const messages = useCommonMessages();
  const [value, setValue] = useControllableState<readonly Key[]>(
    valueProp,
    defaultValue ?? [],
    onChange as ((next: readonly Key[]) => void) | undefined,
  );
  const [inputValue, setInputValue] = useState('');
  // Remember chosen items, so their chips keep a label after the list filters them out (or async results change).
  const [known, setKnown] = useState<ReadonlyMap<Key, T>>(() => new Map());

  const allItems = [...(asyncItems ?? staticItems ?? [])];
  const chosen = new Set(value);
  const available = allItems.filter((item) => !chosen.has(item.id));
  const lookup = (key: Key): T | undefined =>
    known.get(key) ?? allItems.find((item) => item.id === key);

  const add = (key: Key) => {
    const item = lookup(key);
    if (item) {
      setKnown(new Map(known).set(key, item));
    }
    setValue([...value, key]);
    setInputValue('');
    onSearch?.('');
  };
  const remove = (key: Key) => {
    setValue(value.filter((existing) => existing !== key));
  };

  const emptyContent = loadError
    ? messages.loadError
    : isLoading
      ? messages.loading
      : messages.noResults;

  return (
    <AriaComboBox
      ref={ref}
      value={null}
      onChange={(key) => {
        if (key !== null) {
          add(key);
        } else {
          // Escape or blur: with both value and text controlled, React Aria expects the app to reset the text
          // (otherwise it sees changed text and reopens the list).
          setInputValue('');
          onSearch?.('');
        }
      }}
      inputValue={inputValue}
      onInputChange={(text) => {
        setInputValue(text);
        onSearch?.(text);
      }}
      {...(asyncItems ? { items: available } : { defaultItems: available })}
      allowsEmptyCollection
      isDisabled={isDisabled}
      isRequired={isRequired && value.length === 0}
      isInvalid={isInvalid}
      aria-label={ariaLabel}
      className={fieldRootClasses(className)}
    >
      <FieldFrame {...props}>
        <Group className={cn(inputGroupClasses, chipGroupClasses[size])}>
          {/* Inside a ComboBox every React Aria Button inherits the combo box trigger's behaviour through context;
              clear it so each chip's remove button is only a remove button. */}
          <ButtonContext.Provider value={null}>
            {value.map((key) => {
              const item = lookup(key);
              return (
                <Chip
                  key={String(key)}
                  size="sm"
                  isDisabled={isDisabled}
                  onRemove={() => {
                    remove(key);
                  }}
                >
                  {item ? getItemLabel(item) : String(key)}
                </Chip>
              );
            })}
          </ButtonContext.Provider>
          <Input
            placeholder={value.length === 0 ? placeholder : undefined}
            onKeyDown={(event) => {
              if (
                event.key === 'Backspace' &&
                event.currentTarget.value === '' &&
                value.length > 0
              ) {
                const last = value[value.length - 1];
                if (last !== undefined) {
                  remove(last);
                }
              }
            }}
            className={chipInputClasses}
          />
          {isLoading && <SpinnerIcon className="me-1 size-4 shrink-0 text-fg-muted" />}
          <AriaButton className={inputButtonClasses}>
            <ChevronDown aria-hidden="true" className="size-4" />
          </AriaButton>
        </Group>
      </FieldFrame>
      <AriaPopover className={cn('max-h-[50vh]', popoverClasses)}>
        <ListBox
          className={listBoxClasses}
          renderEmptyState={() => <ListBoxEmpty>{emptyContent}</ListBoxEmpty>}
        >
          {children}
        </ListBox>
      </AriaPopover>
    </AriaComboBox>
  );
}
