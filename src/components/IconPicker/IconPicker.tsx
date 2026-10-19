import { useMemo, type Ref } from 'react';
import type { SelectProps as AriaSelectProps } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { pickerStrings } from '../../provider/coreStrings';
import type { IconComponent } from '../../utils/icon';
import type { FieldBaseProps } from '../Field/Field';
import { TilePicker } from '../TilePicker/TilePicker';

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

/**
 * Choose an icon from a set the app supplies: a searchable grid (arrow keys move in two dimensions) in a popover. The
 * value is the icon's `id`.
 */
export function IconPicker({ icons, onChange, ...rest }: IconPickerProps) {
  const messages = useEntryMessages(pickerStrings);
  const rows = useMemo(() => [{ id: 'icons', items: icons }], [icons]);
  return (
    <TilePicker
      {...rest}
      rows={rows}
      onChange={(value) => {
        onChange?.(value);
      }}
      placeholder={messages.noIcon}
      searchLabel={messages.searchIcons}
      renderTile={(option) => {
        const Icon = option.icon;
        return (
          <>
            <Icon aria-hidden="true" className="size-5" />
            <span className="w-full truncate text-center text-xs">{option.label}</span>
          </>
        );
      }}
      renderValue={(option) => {
        const Icon = option.icon;
        return (
          <>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{option.label}</span>
          </>
        );
      }}
    />
  );
}
