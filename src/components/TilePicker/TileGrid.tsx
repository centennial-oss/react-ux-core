// TileGrid: options as tiles in rows, each row with an optional title and its tiles wrapping to fill the width. Arrow
// keys move in two dimensions, across rows too. The app draws each tile (a colour, an icon, a flag); the grid handles
// selection, focus and keyboard. Used inside TilePicker's popover, or on its own.

import type { CSSProperties, ReactNode } from 'react';
import {
  Collection,
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  type ListBoxProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';

/** A choice in a tile grid. */
export interface TileOption<T = unknown> {
  /** Unique across the grid; the value when chosen. */
  id: string;
  /** Names the tile (and is searched). */
  label: string;
  /** More words to search by. */
  keywords?: readonly string[];
  /** The app's data for this choice, handed back when it's chosen. */
  data?: T;
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
}

export interface TileGridProps<O extends TileOption> extends Omit<
  ListBoxProps<TileRow<O>>,
  'items' | 'children' | 'layout' | 'className' | 'style' | 'renderEmptyState'
> {
  rows: readonly TileRow<O>[];
  /** Draws a tile's content. The tile itself (focus ring, selected state, hit area) is drawn by the grid. */
  renderTile: (option: O, state: TileRenderState) => ReactNode;
  /** The narrowest a tile gets as the row wraps, as a CSS length. Defaults to `4.5rem`. */
  minTileWidth?: string;
  /** Shown when there are no tiles, for example when a search matches nothing. */
  emptyContent?: ReactNode;
  className?: string;
}

const tileClasses = [
  'flex min-h-hit cursor-default flex-col items-center justify-center gap-1 rounded-control p-2 text-fg outline-none select-none',
  'data-focused:bg-surface-3 data-pressed:bg-surface-4 data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
  'data-selected:bg-accent-bg data-selected:text-accent-fg',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
].join(' ');

/** Tiles in titled rows that wrap to the available width, with two-dimensional keyboard navigation. */
export function TileGrid<O extends TileOption>({
  rows,
  renderTile,
  minTileWidth = '4.5rem',
  emptyContent,
  className,
  ...rest
}: TileGridProps<O>) {
  return (
    <ListBox
      {...rest}
      items={rows}
      layout="grid"
      renderEmptyState={
        emptyContent === undefined
          ? undefined
          : () => <div className="px-2 py-3 text-center text-sm text-fg-muted">{emptyContent}</div>
      }
      // Dynamic geometry: the narrowest tile is the app's value, so it's passed as a custom property.
      // eslint-disable-next-line no-restricted-syntax
      style={{ '--tile-min-width': minTileWidth } as CSSProperties}
      className={cn('flex min-h-0 flex-col gap-2 overflow-auto outline-none', className)}
    >
      {(row) => (
        <ListBoxSection
          id={row.id}
          className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(var(--tile-min-width),1fr))] gap-1"
        >
          {row.title !== undefined && (
            <Header className="col-span-full px-1 pt-1 text-xs font-semibold text-fg-muted">
              {row.title}
            </Header>
          )}
          <Collection items={row.items}>
            {(option) => (
              <ListBoxItem
                id={option.id}
                textValue={option.label}
                isDisabled={option.isDisabled}
                className={tileClasses}
              >
                {({ isSelected, isFocused, isDisabled }) =>
                  renderTile(option, { isSelected, isFocused, isDisabled })
                }
              </ListBoxItem>
            )}
          </Collection>
        </ListBoxSection>
      )}
    </ListBox>
  );
}
