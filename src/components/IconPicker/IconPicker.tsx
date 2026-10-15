import { ChevronDown } from 'lucide-react';
import type { Ref } from 'react';
import {
  Autocomplete,
  Button as AriaButton,
  Popover as AriaPopover,
  ListBox,
  ListBoxItem,
  Select as AriaSelect,
  SelectValue,
  useFilter,
  type Key,
  type SelectProps as AriaSelectProps,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import {
  FieldFrame,
  fieldRootClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { ListBoxEmpty } from '../ListBox/ListBoxParts';
import { SearchField } from '../SearchField/SearchField';
import { popoverClasses } from '../Overlay/styles';

/** An icon the picker offers. */
export interface IconOption {
  /** Stored as the value. */
  id: string;
  /** Names the icon (and is searched). */
  label: string;
  icon: IconComponent;
  /** More words to search by. */
  keywords?: readonly string[];
}

export interface IconPickerProps
  extends
    FieldBaseProps,
    Pick<AriaSelectProps, 'isOpen' | 'defaultOpen' | 'onOpenChange' | 'name' | 'autoFocus'> {
  /** The icon set to choose from, supplied by the app. */
  icons: readonly IconOption[];
  /** The chosen icon's `id`, or null for none. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const tileClasses = [
  'flex cursor-default flex-col items-center justify-center gap-1 rounded-control p-2 text-fg outline-none select-none',
  'data-focused:bg-surface-3 data-pressed:bg-surface-4 data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
  'data-selected:bg-accent-bg data-selected:text-accent-fg',
].join(' ');

/**
 * Choose an icon from a set the app supplies: a searchable grid (arrow keys move in two dimensions) in a popover, or
 * a bottom sheet on phones. The value is the icon's `id`.
 */
export function IconPicker({
  icons,
  value,
  defaultValue,
  onChange,
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  className,
  ref,
  ...rest
}: IconPickerProps) {
  const messages = useMessages();
  const { contains } = useFilter({ sensitivity: 'base' });
  return (
    <AriaSelect
      {...rest}
      ref={ref}
      // React Aria's Select takes the chosen key; null clears it.
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      onChange={(key: Key | null) => {
        onChange?.(key === null ? null : String(key));
      }}
      placeholder={messages.noIcon}
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
            inputHeightClasses.md,
            'cursor-pointer justify-between gap-2 px-3 text-start text-base outline-none data-focus-visible:focus-ring sm:text-sm',
          )}
        >
          <SelectValue<IconOption> className="flex min-w-0 flex-1 items-center gap-2 truncate data-placeholder:text-fg-muted">
            {({ selectedItems, defaultChildren }) => {
              const [selectedItem] = selectedItems;
              if (!selectedItem) {
                return defaultChildren;
              }
              const Icon = selectedItem.icon;
              return (
                <>
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{selectedItem.label}</span>
                </>
              );
            }}
          </SelectValue>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
        </AriaButton>
      </FieldFrame>
      {/*
        An anchored panel on every screen, like ComboBox: the search takes focus as it opens, and focusing an input
        inside a phone's swipe sheet scrolls the sheet closed.
      */}
      <AriaPopover
        placement="bottom start"
        className={cn('flex max-h-[min(28rem,60dvh)] flex-col', popoverClasses)}
      >
        <div className="flex min-h-0 w-80 max-w-full flex-col gap-2 p-2">
          <Autocomplete
            filter={(text, input) => {
              const option = icons.find((icon) => icon.label === text);
              return [text, ...(option?.keywords ?? [])].some((word) => contains(word, input));
            }}
          >
            <SearchField aria-label={messages.searchIcons} size="sm" />
            <ListBox
              items={icons}
              layout="grid"
              className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1 overflow-auto outline-none"
              renderEmptyState={() => <ListBoxEmpty>{messages.noResults}</ListBoxEmpty>}
            >
              {(option) => {
                const Icon = option.icon;
                return (
                  <ListBoxItem id={option.id} textValue={option.label} className={tileClasses}>
                    <Icon aria-hidden="true" className="size-5" />
                    <span className="w-full truncate text-center text-xs">{option.label}</span>
                  </ListBoxItem>
                );
              }}
            </ListBox>
          </Autocomplete>
        </div>
      </AriaPopover>
    </AriaSelect>
  );
}
