// TilePicker: a field whose trigger opens a popover of tiles in titled rows (a TileGrid), with an optional search. The
// app supplies the rows, draws the tiles and the trigger's value; IconPicker and FlagPicker are built on it.

import { ChevronDown } from 'lucide-react';
import { useMemo, type ReactNode, type Ref } from 'react';
import {
  Autocomplete,
  Button as AriaButton,
  Popover as AriaPopover,
  Select as AriaSelect,
  SelectValue,
  useFilter,
  type Key,
  type SelectProps as AriaSelectProps,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import {
  FieldFrame,
  fieldRootClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { popoverClasses } from '../Overlay/styles';
import { SearchField } from '../SearchField/SearchField';
import {
  TileGrid,
  tileText,
  type TileOption,
  type TileRenderState,
  type TileRow,
} from './TileGrid';

export interface TilePickerProps<O extends TileOption>
  extends
    FieldBaseProps,
    Pick<AriaSelectProps, 'isOpen' | 'defaultOpen' | 'onOpenChange' | 'name' | 'autoFocus'> {
  /** The choices, in rows. */
  rows: readonly TileRow<O>[];
  /** The chosen option's `id`, or null for none. */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the chosen option's `id` and the option itself (with its `data`), or null when cleared. */
  onChange?: (value: string | null, option: O | null) => void;
  /** Draws a tile's content. */
  renderTile: (option: O, state: TileRenderState) => ReactNode;
  /** Draws the chosen option in the trigger. Defaults to its label. */
  renderValue?: (option: O) => ReactNode;
  /** Shown in the trigger when nothing is chosen. */
  placeholder?: string;
  /** Names the search field above the tiles. Without it, there's no search. */
  searchLabel?: string;
  /** The narrowest a tile gets as a row wraps, as a CSS length. Defaults to `4.5rem`. */
  minTileWidth?: string;
  /** Classes for the popover's panel, for example a wider `w-96` for larger tiles. Defaults to `w-80`. */
  panelClassName?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Choose one option from tiles in rows: a popover with an optional search (by label or keyword) and a grid that arrow
 * keys move through in two dimensions. On phones the popover stays anchored, like ComboBox.
 */
export function TilePicker<O extends TileOption>({
  rows,
  value,
  defaultValue,
  onChange,
  renderTile,
  renderValue,
  placeholder,
  searchLabel,
  minTileWidth,
  panelClassName = 'w-80',
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  className,
  ref,
  ...rest
}: TilePickerProps<O>) {
  const messages = useMessages();
  const { contains } = useFilter({ sensitivity: 'base' });
  const options = useMemo(
    () => new Map(rows.flatMap((row) => row.items.map((option) => [option.id, option] as const))),
    [rows],
  );
  const keywordsByText = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const option of options.values()) {
      const text = tileText(option);
      map.set(text, [...(map.get(text) ?? []), ...(option.keywords ?? [])]);
    }
    return map;
  }, [options]);
  const [current, setCurrent] = useControllableState<string | null>(
    value,
    defaultValue ?? null,
    (next) => {
      onChange?.(next, next === null ? null : (options.get(next) ?? null));
    },
  );
  const selected = current === null ? undefined : options.get(current);

  const grid = (
    <TileGrid
      rows={rows}
      renderTile={renderTile}
      minTileWidth={minTileWidth}
      emptyContent={messages.noResults}
      className="flex-1"
    />
  );

  return (
    <AriaSelect
      {...rest}
      ref={ref}
      value={current}
      onChange={(key: Key | null) => {
        setCurrent(key === null ? null : String(key));
      }}
      placeholder={placeholder}
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
          <SelectValue className="flex min-w-0 flex-1 items-center gap-2 truncate data-placeholder:text-fg-muted">
            {({ defaultChildren }) =>
              selected === undefined ? (
                defaultChildren
              ) : renderValue ? (
                renderValue(selected)
              ) : (
                <span className="truncate">{selected.label}</span>
              )
            }
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
        <div className={cn('flex min-h-0 max-w-full flex-col gap-2 p-2', panelClassName)}>
          {searchLabel === undefined ? (
            grid
          ) : (
            <Autocomplete
              filter={(text, input) =>
                [text, ...(keywordsByText.get(text) ?? [])].some((word) => contains(word, input))
              }
            >
              <SearchField aria-label={searchLabel} size="sm" />
              {grid}
            </Autocomplete>
          )}
        </div>
      </AriaPopover>
    </AriaSelect>
  );
}
