import { ChevronDown } from 'lucide-react';
import type { ReactElement, ReactNode, Ref } from 'react';
import {
  Button as AriaButton,
  ComboBox as AriaComboBox,
  Group,
  Input,
  ListBox,
  Popover as AriaPopover,
  useAsyncList,
  type ComboBoxProps as AriaComboBoxProps,
} from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
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
import { ListBoxEmpty, listBoxClasses } from '../ListBox/ListBoxParts';
import { popoverClasses } from '../Overlay/styles';
import { SpinnerIcon } from '../Spinner/SpinnerIcon';

type ReplacedProps =
  | 'className'
  | 'style'
  | 'children'
  | 'render'
  | 'items'
  | 'defaultItems'
  | 'selectionMode'
  | 'selectedKey'
  | 'defaultSelectedKey'
  | 'onSelectionChange'
  | 'placeholder';

export interface ComboBoxProps<T extends object>
  extends Omit<AriaComboBoxProps<T>, ReplacedProps>, FieldBaseProps {
  /** Static items, filtered as the user types. */
  items?: Iterable<T>;
  /**
   * Loads items for the typed text instead of `items`. Calls are debounced, and the `signal` aborts when a newer
   * query starts, so stale results never arrive.
   */
  loadItems?: (query: string, signal: AbortSignal) => Promise<Iterable<T>>;
  /** Debounce for `loadItems`, in milliseconds. Defaults to 300. */
  loadDelay?: number;
  /** Options, or a function that renders an `Option` for each item. */
  children: ReactNode | ((item: T) => ReactElement);
  placeholder?: string;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface ShellProps<T extends object> extends ComboBoxProps<T> {
  emptyContent: ReactNode;
  isLoading: boolean;
  /** Async results: React Aria shows them as given, without filtering. */
  collectionItems?: Iterable<T>;
  /** Static items: React Aria filters them by the typed text. */
  collectionDefaultItems?: Iterable<T>;
}

function ComboBoxShell<T extends object>(props: ShellProps<T>) {
  const {
    label,
    description,
    errorMessage,
    labelPosition,
    infoTip,
    children,
    placeholder,
    size = 'md',
    className,
    emptyContent,
    isLoading,
    collectionItems,
    collectionDefaultItems,
    items: _items,
    loadItems: _loadItems,
    loadDelay: _loadDelay,
    ...rest
  } = props;
  return (
    <AriaComboBox
      {...rest}
      items={collectionItems}
      defaultItems={collectionDefaultItems}
      allowsEmptyCollection
      className={fieldRootClasses(className)}
    >
      <FieldFrame {...props}>
        <Group className={cn(inputGroupClasses, inputHeightClasses[size])}>
          <Input placeholder={placeholder} className={inputClasses} />
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

function AsyncComboBox<T extends object>(
  props: ComboBoxProps<T> & { loadItems: NonNullable<ComboBoxProps<T>['loadItems']> },
) {
  const messages = useCommonMessages();
  const {
    loadItems,
    loadDelay = 300,
    inputValue: inputValueProp,
    defaultInputValue,
    onInputChange,
  } = props;
  const [inputValue, setInputValue] = useControllableState(
    inputValueProp,
    defaultInputValue ?? '',
    onInputChange,
  );

  const list = useAsyncList<T>({
    async load({ signal, filterText }) {
      return { items: [...(await loadItems(filterText ?? '', signal))] };
    },
    initialFilterText: inputValue,
  });
  const search = useDebouncedCallback((text: string) => {
    list.setFilterText(text);
  }, loadDelay);

  const isLoading = list.loadingState === 'loading' || list.loadingState === 'filtering';
  const emptyContent = list.error
    ? messages.loadError
    : isLoading
      ? messages.loading
      : messages.noResults;

  return (
    <ComboBoxShell
      {...props}
      defaultInputValue={undefined}
      collectionItems={list.items}
      inputValue={inputValue}
      onInputChange={(text) => {
        setInputValue(text);
        search.run(text);
      }}
      isLoading={isLoading}
      emptyContent={emptyContent}
    />
  );
}

/**
 * A text input with a list of suggestions: typeahead over static `items`, or async results from `loadItems`. Value
 * is the chosen option's `id` (`value` / `defaultValue` / `onChange`); with `allowsCustomValue` the typed text can
 * stand on its own (`inputValue` / `onInputChange`).
 */
export function ComboBox<T extends object>(props: ComboBoxProps<T>) {
  const messages = useCommonMessages();
  if (props.loadItems) {
    return <AsyncComboBox {...props} loadItems={props.loadItems} />;
  }
  return (
    <ComboBoxShell
      {...props}
      collectionDefaultItems={props.items}
      isLoading={false}
      emptyContent={messages.noResults}
    />
  );
}
