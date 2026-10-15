import { ChevronDown } from 'lucide-react';
import { useContext, type ReactElement, type ReactNode, type Ref } from 'react';
import {
  Button as AriaButton,
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
  | 'placeholder';

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, ReplacedProps>, FieldBaseProps {
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

/**
 * Choose one option from a list. Value is the chosen option's `id` (`value` / `defaultValue` / `onChange`).
 * Keyboard: arrows, typeahead, Enter, Escape. On phones the list opens as a bottom sheet.
 */
export function Select<T extends object>({
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
  ...rest
}: SelectProps<T>) {
  const messages = useMessages();
  const sheetLabel = typeof label === 'string' ? label : rest['aria-label'];

  return (
    <AriaSelect
      {...rest}
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
        <AriaButton
          className={cn(
            inputGroupClasses,
            inputHeightClasses[size],
            'cursor-pointer justify-between gap-2 px-3 text-start text-base outline-none data-focus-visible:focus-ring sm:text-sm',
          )}
        >
          {/* The chosen option's text only: its description, icon and check belong in the list. */}
          <SelectValue className="min-w-0 flex-1 truncate data-placeholder:text-fg-muted">
            {({ isPlaceholder, selectedText, defaultChildren }) =>
              isPlaceholder ? defaultChildren : selectedText
            }
          </SelectValue>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
        </AriaButton>
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
