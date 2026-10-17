import { ChevronDown, X } from 'lucide-react';
import {
  useContext,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import {
  Button as AriaButton,
  ButtonContext,
  type Key,
  ListBox,
  Popover as AriaPopover,
  Select as AriaSelect,
  SelectStateContext,
  SelectValue,
  type SelectProps as AriaSelectProps,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useIsPhone } from '../../utils/useMediaQuery';
import {
  FieldFrame,
  fieldRootClasses,
  inputButtonClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { ListBoxEmpty, listBoxClasses } from '../ListBox/ListBoxParts';
import { SheetSurface } from '../Overlay/SheetSurface';
import { popoverClasses } from '../Overlay/styles';

/**
 * The options overlay: an anchored popover, or a bottom sheet on phones. Select builds its collection by rendering
 * its children once in a hidden pass (outside its providers); a sheet renders nothing there, so it only wraps the
 * list once the Select's state exists.
 */
function SelectOverlay({ children, label }: { children: ReactNode; label: string | undefined }) {
  const isPhone = useIsPhone();
  const state = useContext(SelectStateContext);
  if (!isPhone) {
    return <AriaPopover className={cn('max-h-[50vh]', popoverClasses)}>{children}</AriaPopover>;
  }
  if (!state) {
    return <>{children}</>;
  }
  return (
    <SheetSurface aria-label={label}>
      <div className="overflow-auto p-1">{children}</div>
    </SheetSurface>
  );
}

type ReplacedProps =
  | 'className'
  | 'style'
  | 'children'
  | 'render'
  | 'selectionMode'
  | 'selectedKey'
  | 'defaultSelectedKey'
  | 'onSelectionChange'
  | 'placeholder'
  | 'value'
  | 'defaultValue'
  | 'onChange';

interface SelectBaseProps<T extends object, K extends Key>
  extends Omit<AriaSelectProps<T>, ReplacedProps>, FieldBaseProps {
  /**
   * The chosen option's `id`, controlled. Its type is inferred, so a Select bound to union-typed state reports that
   * union. Option ids must come from the same union.
   */
  value?: K | null;
  /** The initially chosen option's `id`, uncontrolled. It doesn't widen the value type. */
  defaultValue?: NoInfer<K> | null;
  /** Items for a dynamic list, rendered by the `children` function. */
  items?: Iterable<T>;
  /** Options (`Option`, `OptionSection`), or a function that renders an `Option` for each item. */
  children: ReactNode | ((item: T) => ReactElement);
  /** Shown when nothing is selected. Defaults to the `selectPlaceholder` message. */
  placeholder?: string;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface SelectRequiredProps<K extends Key> {
  /** Shows a clear button, so `onChange` may receive null. Defaults to false. */
  isClearable?: false;
  /** Called with the chosen option's `id`. */
  onChange?: (value: K) => void;
}

interface SelectClearableProps<K extends Key> {
  isClearable: true;
  /** Called with the chosen option's `id`, or null when cleared. */
  onChange?: (value: K | null) => void;
}

/** `T` is the item type of a dynamic list; `K` the option ids' type, inferred from `value` or `onChange`. */
export type SelectProps<T extends object = object, K extends Key = Key> = SelectBaseProps<T, K> &
  (SelectRequiredProps<K> | SelectClearableProps<K>);

/** Clears the choice and returns focus to the trigger. Shown while something is chosen. */
function ClearButton({ triggerRef }: { triggerRef: RefObject<HTMLButtonElement | null> }) {
  const messages = useMessages();
  const state = useContext(SelectStateContext);
  if ((state?.value ?? null) === null) {
    return null;
  }
  return (
    <AriaButton
      aria-label={messages.clearValue}
      onPress={() => {
        state?.setValue(null);
        triggerRef.current?.focus();
      }}
      className={inputButtonClasses}
    >
      <X aria-hidden="true" className="size-4" />
    </AriaButton>
  );
}

/**
 * Choose one option from a list. Value is the chosen option's `id` (`value` / `defaultValue` / `onChange`).
 * Keyboard: arrows, typeahead, Enter, Escape. On phones the list opens as a bottom sheet.
 */
export function Select<T extends object = object, K extends Key = Key>({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  items,
  children,
  placeholder,
  size = 'md',
  className,
  isClearable = false,
  onChange,
  ...rest
}: SelectProps<T, K>) {
  const messages = useMessages();
  const sheetLabel = typeof label === 'string' ? label : rest['aria-label'];
  const triggerRef = useRef<HTMLButtonElement>(null);
  const value = (
    <>
      {/* The chosen option's text only: its description, icon and check belong in the list. */}
      <SelectValue className="min-w-0 flex-1 truncate data-placeholder:text-fg-muted">
        {({ isPlaceholder, selectedText, defaultChildren }) =>
          isPlaceholder ? defaultChildren : selectedText
        }
      </SelectValue>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
    </>
  );

  return (
    <AriaSelect
      {...rest}
      onChange={(key: Key | null) => {
        // React Aria reports a Key; it's always one of the options' ids, which the caller typed as K.
        if (key !== null) {
          onChange?.(key as K);
        } else if (isClearable) {
          (onChange as ((value: K | null) => void) | undefined)?.(null);
        }
      }}
      placeholder={placeholder ?? messages.selectPlaceholder}
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
        {isClearable ? (
          // The clear button sits beside the trigger, inside the same field border (a button can't hold another).
          <div
            className={cn(
              inputGroupClasses,
              inputHeightClasses[size],
              'has-[[data-select-trigger][data-focus-visible]]:focus-ring',
            )}
          >
            <AriaButton
              ref={triggerRef}
              data-select-trigger=""
              className="flex h-full min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 px-3 text-start text-base outline-none sm:text-sm"
            >
              {value}
            </AriaButton>
            {/* Select gives its trigger's props to buttons inside it; the clear button isn't the trigger. */}
            <ButtonContext.Provider value={null}>
              <ClearButton triggerRef={triggerRef} />
            </ButtonContext.Provider>
          </div>
        ) : (
          <AriaButton
            ref={triggerRef}
            className={cn(
              inputGroupClasses,
              inputHeightClasses[size],
              'cursor-pointer justify-between gap-2 px-3 text-start text-base outline-none data-focus-visible:focus-ring sm:text-sm',
            )}
          >
            {value}
          </AriaButton>
        )}
      </FieldFrame>
      <SelectOverlay label={sheetLabel}>
        <ListBox
          items={items}
          className={listBoxClasses}
          renderEmptyState={() => <ListBoxEmpty>{messages.noResults}</ListBoxEmpty>}
        >
          {children}
        </ListBox>
      </SelectOverlay>
    </AriaSelect>
  );
}
