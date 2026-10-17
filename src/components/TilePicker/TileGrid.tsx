// TileGrid: tiles in rows, each row with an optional title and its tiles wrapping to fill the width. Arrow keys move
// in two dimensions, across rows too, with Home, End and typeahead. Tiles are actions (a question navigator, with the
// current one marked) or choices (one, or up to `maxSelected`), drawn by the app (`renderTile`) or from their parts:
// media, label, description, a status in words, a corner badge and a footer. TilePicker uses it in its popover.

import { Check } from 'lucide-react';
import { useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  Collection,
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  type Key,
  type ListBoxProps,
  type Selection,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { Tone } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { StatusDot } from '../StatusDot/StatusDot';

/** A tile's status, shown as a shape (or icon) and a word, never colour alone: answered, flagged, sold out. */
export interface TileStatus {
  tone: Tone;
  label: string;
  /** Replaces the tone's shape. */
  icon?: IconComponent;
}

/** A tile. */
export interface TileOption<T = unknown> {
  /** Unique across the grid; the value when chosen, or the id passed to `onAction`. */
  id: string;
  /** The tile's main text, such as "12", "Jane Doe" or "Pad Thai". */
  label: ReactNode;
  /** Plain text for typeahead, search and the tile's name, when `label` isn't a string. */
  textValue?: string;
  /** More words to search by (TilePicker). */
  keywords?: readonly string[];
  /** The app's data for this tile, handed back when it's chosen (TilePicker). */
  data?: T;
  description?: ReactNode;
  /** A picture or icon area at the top of the tile. */
  media?: ReactNode;
  /** Text at the bottom, such as a price. */
  footer?: ReactNode;
  status?: TileStatus;
  /** A small marker in the corner, such as a flag icon or a count. */
  badge?: ReactNode;
  isDisabled?: boolean;
}

/** A row of tiles, with an optional title such as "North America". */
export interface TileRow<O extends TileOption = TileOption> {
  id: string;
  title?: string;
  items: readonly O[];
}

/** A tile's state, for `renderTile`. */
export interface TileRenderState {
  isSelected: boolean;
  isFocused: boolean;
  isDisabled: boolean;
  isCurrent: boolean;
}

/** The plain text of a tile: its `textValue`, its label when that's a string, or its id. */
export function tileText(option: TileOption): string {
  return option.textValue ?? (typeof option.label === 'string' ? option.label : option.id);
}

type ManagedProps =
  | 'items'
  | 'children'
  | 'layout'
  | 'className'
  | 'style'
  | 'renderEmptyState'
  | 'selectionMode'
  | 'selectedKeys'
  | 'defaultSelectedKeys'
  | 'onSelectionChange'
  | 'onAction'
  | 'disabledKeys';

export interface TileGridProps<O extends TileOption> extends Omit<
  ListBoxProps<TileRow<O>>,
  ManagedProps
> {
  /** Tiles in titled rows. */
  rows?: readonly TileRow<O>[];
  /** Tiles in one untitled row, instead of `rows`. */
  items?: readonly O[];
  /** Draws a tile's content. Without it, tiles are drawn from their parts (media, label, status…). */
  renderTile?: (option: O, state: TileRenderState) => ReactNode;
  /**
   * `none`: tiles are actions (`onAction`), like a question navigator. `single` / `multiple`: tiles are choices with
   * a checked state. Leave it unset when TilePicker (or another collection component) owns the selection.
   */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** The chosen tiles' ids, controlled. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (value: string[]) => void;
  /** With `multiple`, the most tiles that can be chosen ("vote for up to 3"); the rest disable once it's reached. */
  maxSelected?: number;
  /** Called when a tile is pressed (or Enter) in `none` mode, such as "go to question 12". */
  onAction?: (id: string) => void;
  /** The tile shown as current (`aria-current`), such as the question on screen. */
  currentId?: string;
  /** `compact` fits number-only tiles (navigators); `card` fits media and descriptions. Defaults to `card`. */
  density?: 'compact' | 'card';
  /** Each tile's minimum width as a CSS length; as many columns as fit. Defaults by density. */
  minTileWidth?: string;
  /** The statuses in use, explained above or below the grid. */
  legend?: readonly TileStatus[];
  /** Defaults to `top`. */
  legendPosition?: 'top' | 'bottom';
  /** A visible label for the grid. */
  label?: ReactNode;
  /** Help text under the grid. */
  description?: ReactNode;
  /** Tiles can't be chosen or pressed, but stay readable (a results view). */
  isReadOnly?: boolean;
  isDisabled?: boolean;
  /** Shown when there are no tiles, for example when a search matches nothing. */
  emptyContent?: ReactNode;
  className?: string;
}

const baseTileClasses = [
  'relative flex cursor-default rounded-control text-fg outline-none select-none',
  'data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
].join(' ');

const densityTileClasses = {
  // TilePicker's tiles: the app draws the content.
  plain: [
    'min-h-hit flex-col items-center justify-center gap-1 p-2',
    'data-focused:bg-surface-3 data-pressed:bg-surface-4 data-selected:bg-accent-bg data-selected:text-accent-fg',
  ].join(' '),
  compact: [
    'aspect-square min-h-hit min-w-hit flex-col items-center justify-center border border-border bg-surface-1',
    'text-sm font-medium tabular-nums data-hovered:bg-surface-3 data-pressed:bg-surface-4',
    'data-selected:border-accent-solid data-selected:bg-accent-bg data-selected:text-accent-fg',
  ].join(' '),
  card: [
    'h-full flex-col items-stretch gap-1.5 rounded-card border border-border bg-surface-1 p-3 text-start',
    'data-hovered:bg-surface-2 data-pressed:bg-surface-3',
    'data-selected:border-accent-solid data-selected:bg-accent-bg',
  ].join(' '),
} as const;

const defaultMinWidth = { plain: '4.5rem', compact: '2.75rem', card: '12rem' } as const;

const statusIconClasses: Record<Tone, string> = {
  neutral: 'text-neutral-fg',
  accent: 'text-accent-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
};

/** A status as its shape (or icon) and word; the word can be visually hidden. */
function StatusMark({ status, isLabelHidden }: { status: TileStatus; isLabelHidden?: boolean }) {
  if (!status.icon) {
    return (
      <StatusDot tone={status.tone} label={status.label} size="sm" isLabelHidden={isLabelHidden} />
    );
  }
  const Icon = status.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <Icon
        aria-hidden="true"
        className={cn('size-3.5 shrink-0', statusIconClasses[status.tone])}
      />
      <span className={isLabelHidden ? 'sr-only' : undefined}>{status.label}</span>
    </span>
  );
}

/** A tile drawn from its parts. */
function DefaultTile({
  option,
  state,
  density,
  hasCheck,
}: {
  option: TileOption;
  state: TileRenderState;
  density: 'compact' | 'card';
  hasCheck: boolean;
}) {
  const check = hasCheck && (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border',
        state.isSelected
          ? 'border-accent-solid bg-accent-solid text-accent-on-solid'
          : 'border-border-strong bg-surface-1',
      )}
    >
      {state.isSelected && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
  if (density === 'compact') {
    return (
      <>
        <span className="min-w-0 truncate px-1">{option.label}</span>
        {option.status && (
          <span className="absolute end-0.5 top-0.5 inline-flex">
            <StatusMark status={option.status} isLabelHidden />
          </span>
        )}
        {option.badge !== undefined && (
          <span className="absolute start-0.5 top-0.5 inline-flex text-xs">{option.badge}</span>
        )}
        {check && <span className="absolute end-0.5 bottom-0.5 inline-flex">{check}</span>}
      </>
    );
  }
  return (
    <>
      {option.media !== undefined && (
        <div className="-mx-3 -mt-3 mb-1 overflow-hidden rounded-t-card">{option.media}</div>
      )}
      <div className="flex min-w-0 items-start gap-2">
        {check && <span className="mt-0.5 inline-flex">{check}</span>}
        <span className="min-w-0 flex-1 font-medium break-words">{option.label}</span>
        {option.badge !== undefined && (
          <span className="inline-flex shrink-0 text-xs">{option.badge}</span>
        )}
      </div>
      {option.description !== undefined && (
        <span className="text-xs text-fg-muted">{option.description}</span>
      )}
      {option.status && <StatusMark status={option.status} />}
      {option.footer !== undefined && (
        <span className="mt-auto pt-1 text-sm font-semibold tabular-nums">{option.footer}</span>
      )}
    </>
  );
}

/** Explains the statuses in use. */
function TileLegend({ legend }: { legend: readonly TileStatus[] }) {
  const messages = useMessages();
  return (
    <ul
      aria-label={messages.tileLegend}
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted"
    >
      {legend.map((status) => (
        <li key={status.label} className="inline-flex">
          <StatusMark status={status} />
        </li>
      ))}
    </ul>
  );
}

/** Tiles in titled rows that wrap to the available width, with two-dimensional keyboard navigation. */
export function TileGrid<O extends TileOption>({
  rows: rowsProp,
  items,
  renderTile,
  selectionMode,
  value,
  defaultValue,
  onChange,
  maxSelected,
  onAction,
  currentId,
  density: densityProp,
  minTileWidth,
  legend,
  legendPosition = 'top',
  label,
  description,
  isReadOnly = false,
  isDisabled = false,
  emptyContent,
  className,
  ...rest
}: TileGridProps<O>) {
  const messages = useMessages();
  const labelId = useId();
  const descriptionId = useId();
  const rows = useMemo(() => rowsProp ?? [{ id: 'tiles', items: items ?? [] }], [rowsProp, items]);
  const allTiles = useMemo(() => rows.flatMap((row) => row.items), [rows]);
  const density = densityProp ?? (renderTile ? 'plain' : 'card');
  const [selected, setSelected] = useControllableState<readonly string[]>(
    value,
    defaultValue ?? [],
    onChange as ((next: readonly string[]) => void) | undefined,
  );
  const isChoosing = selectionMode === 'single' || selectionMode === 'multiple';
  const isAtLimit =
    selectionMode === 'multiple' && maxSelected !== undefined && selected.length >= maxSelected;

  const disabledKeys = useMemo(() => {
    const keys = allTiles.flatMap((tile) =>
      isDisabled ||
      tile.isDisabled === true ||
      (isAtLimit && !selected.includes(tile.id)) ||
      (isReadOnly && !isChoosing)
        ? [tile.id]
        : [],
    );
    return keys;
  }, [allTiles, isDisabled, isAtLimit, selected, isReadOnly, isChoosing]);

  // Only the props this grid owns: inside TilePicker (no selectionMode), the Select's context supplies selection.
  const ownedProps =
    selectionMode === undefined
      ? {}
      : {
          selectionMode: isChoosing ? selectionMode : ('none' as const),
          disabledKeys,
          disabledBehavior: 'selection' as const,
          ...(isChoosing
            ? {
                selectedKeys: new Set<Key>(selected),
                onSelectionChange: (keys: Selection) => {
                  if (isReadOnly) {
                    return;
                  }
                  const next =
                    keys === 'all' ? allTiles.map((tile) => tile.id) : [...keys].map(String);
                  if (maxSelected === undefined || next.length <= maxSelected) {
                    setSelected(next);
                  }
                },
              }
            : {}),
          ...(onAction && !isReadOnly && !isChoosing
            ? {
                onAction: (key: Key) => {
                  onAction(String(key));
                },
              }
            : {}),
        };

  const hasFrame =
    label !== undefined ||
    description !== undefined ||
    legend !== undefined ||
    maxSelected !== undefined;
  const limitText =
    selectionMode === 'multiple' && maxSelected !== undefined
      ? messages.tilesMax({ max: maxSelected })
      : undefined;
  const describedBy =
    hasFrame && (description !== undefined || limitText) ? descriptionId : undefined;

  const grid = (
    <ListBox
      {...rest}
      {...ownedProps}
      aria-labelledby={label !== undefined ? labelId : rest['aria-labelledby']}
      aria-describedby={describedBy}
      items={rows}
      // Items render from outside state too (the limit, the current tile), so re-render them when it changes.
      dependencies={[disabledKeys, currentId, density, isChoosing]}
      layout="grid"
      renderEmptyState={
        emptyContent === undefined
          ? undefined
          : () => <div className="px-2 py-3 text-center text-sm text-fg-muted">{emptyContent}</div>
      }
      // Dynamic geometry: the narrowest tile is the app's value, so it's passed as a custom property.
      // eslint-disable-next-line no-restricted-syntax
      style={{ '--tile-min-width': minTileWidth ?? defaultMinWidth[density] } as CSSProperties}
      className={cn(
        'flex min-h-0 flex-col gap-2 overflow-auto outline-none',
        !hasFrame && className,
      )}
    >
      {(row) => (
        <ListBoxSection
          id={row.id}
          className={cn(
            'grid auto-rows-min gap-1',
            density === 'compact'
              ? 'grid-cols-[repeat(auto-fill,var(--tile-min-width))] gap-1.5'
              : density === 'card'
                ? 'grid-cols-[repeat(auto-fill,minmax(min(var(--tile-min-width),100%),1fr))] gap-3'
                : 'grid-cols-[repeat(auto-fill,minmax(var(--tile-min-width),1fr))]',
          )}
        >
          {row.title !== undefined && (
            <Header className="col-span-full px-1 pt-1 text-xs font-semibold text-fg-muted">
              {row.title}
            </Header>
          )}
          <Collection
            items={row.items}
            dependencies={[disabledKeys, currentId, density, isChoosing]}
          >
            {(option) => {
              const isCurrent = option.id === currentId;
              // Disabled tiles stay focusable (React Aria's "selection" behaviour), so say they're disabled.
              const isUnavailable =
                selectionMode !== undefined &&
                (option.isDisabled === true || disabledKeys.includes(option.id));
              // Added only when they apply, so React Aria's own attributes aren't overwritten.
              const extraAria = {
                ...(isCurrent ? { 'aria-current': true } : {}),
                ...(isUnavailable ? { 'aria-disabled': true } : {}),
              };
              const name =
                option.textValue === undefined
                  ? undefined
                  : [option.textValue, option.status?.label].filter(Boolean).join(', ');
              return (
                <ListBoxItem
                  id={option.id}
                  textValue={tileText(option)}
                  aria-label={name}
                  isDisabled={option.isDisabled}
                  render={(props) =>
                    'href' in props ? (
                      // The tile's content arrives in props.children.
                      // eslint-disable-next-line jsx-a11y/anchor-has-content
                      <a {...props} {...extraAria} />
                    ) : (
                      <div {...props} {...extraAria} />
                    )
                  }
                  className={cn(
                    baseTileClasses,
                    densityTileClasses[density],
                    isCurrent && 'outline-solid outline-2 outline-offset-1 outline-accent-solid',
                  )}
                >
                  {({ isSelected, isFocused, isDisabled: isTileDisabled }) => {
                    const state = { isSelected, isFocused, isDisabled: isTileDisabled, isCurrent };
                    return renderTile ? (
                      renderTile(option, state)
                    ) : (
                      <DefaultTile
                        option={option}
                        state={state}
                        density={density === 'compact' ? 'compact' : 'card'}
                        hasCheck={isChoosing}
                      />
                    );
                  }}
                </ListBoxItem>
              );
            }}
          </Collection>
        </ListBoxSection>
      )}
    </ListBox>
  );

  if (!hasFrame) {
    return grid;
  }
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 text-sm text-fg', className)}>
      {label !== undefined && (
        <span id={labelId} className="font-medium text-fg">
          {label}
        </span>
      )}
      {legend !== undefined && legendPosition === 'top' && <TileLegend legend={legend} />}
      {grid}
      {legend !== undefined && legendPosition === 'bottom' && <TileLegend legend={legend} />}
      {(description !== undefined || limitText !== undefined) && (
        <span id={descriptionId} className="text-xs text-fg-muted">
          {description}
          {description !== undefined && limitText !== undefined && ' '}
          {limitText}
        </span>
      )}
      {selectionMode === 'multiple' && maxSelected !== undefined && (
        <span className="sr-only" aria-live="polite">
          {selected.length > 0
            ? messages.tilesChosen({ count: selected.length, max: maxSelected })
            : ''}
        </span>
      )}
    </div>
  );
}
