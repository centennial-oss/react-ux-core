// The toolbar above a Spreadsheet: search, undo and redo, add row and column, the column menu, the actions menu (the
// same actions as the cell menu, for touch and keyboard users), and the active sort and filters as removable chips.

import {
  BetweenHorizontalEnd,
  BetweenVerticalEnd,
  Columns3,
  Plus,
  Redo2,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Key, Selection } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { Chip } from '../../components/Chip/Chip';
import { IconButton } from '../../components/IconButton/IconButton';
import { MenuItem, MenuSection, MenuSeparator } from '../../components/Menu/Menu';
import { MenuButton, OverflowMenu } from '../../components/Menu/MenuButtons';
import { SearchField } from '../../components/SearchField/SearchField';
import { useIsPhone } from '../../utils/useMediaQuery';
import { useSpreadsheetMessages } from './messages';
import type { SpreadsheetColumn } from './types';

const SHOW_ALL = '__show-all';

export interface SpreadsheetToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  /** Shows undo and redo. */
  canEdit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddRow: (() => void) | undefined;
  onAddColumn: (() => void) | undefined;
  columns: readonly SpreadsheetColumn[];
  hiddenColumns: ReadonlySet<string>;
  onHiddenColumnsChange: (hidden: Set<string>) => void;
  /** The active filters' chips. */
  filterChips: readonly { id: string; text: string }[];
  onRemoveFilter: (id: string) => void;
  /** The sort chip's text, when sorted. */
  sortText: string | undefined;
  onClearSort: () => void;
  onClearAll: () => void;
  /** Edits since the last sort or filter: offer to reapply. */
  isStale: boolean;
  onReapply: () => void;
  renderActions: () => ReactNode;
  onAction: (key: Key) => void;
}

export function SpreadsheetToolbar({
  search,
  onSearchChange,
  canEdit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddRow,
  onAddColumn,
  columns,
  hiddenColumns,
  onHiddenColumnsChange,
  filterChips,
  onRemoveFilter,
  sortText,
  onClearSort,
  onClearAll,
  isStale,
  onReapply,
  renderActions,
  onAction,
}: SpreadsheetToolbarProps) {
  const messages = useSpreadsheetMessages();
  // Phones get icon buttons, so the controls fit on one line under the search field.
  const isPhone = useIsPhone();
  // The typed text is local; the sheet hears it once typing pauses (and on Enter), and a new `search` from the app
  // replaces it.
  const [text, setText] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setText(search);
  }
  const [isActionsOpen, setActionsOpen] = useState(false);
  // The actions stay while the menu animates out, so focus can go back to its button.
  const [hasOpenedActions, setOpenedActions] = useState(false);

  const visibleKeys = columns
    .filter((column) => !hiddenColumns.has(column.id))
    .map((column) => column.id);
  const setVisible = (keys: Iterable<Key>) => {
    const visible = new Set([...keys].map(String));
    onHiddenColumnsChange(
      new Set(columns.filter((column) => !visible.has(column.id)).map((column) => column.id)),
    );
  };
  const hasChips = filterChips.length > 0 || sortText !== undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2 border-b border-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          aria-label={messages.search}
          size="sm"
          value={text}
          onChange={setText}
          onSearch={onSearchChange}
          className="w-full min-w-0 sm:w-64"
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-1">
          {canEdit && (
            <>
              <IconButton
                icon={Undo2}
                aria-label={messages.spreadsheetUndo}
                variant="ghost"
                size="sm"
                isDisabled={!canUndo}
                onPress={onUndo}
              />
              <IconButton
                icon={Redo2}
                aria-label={messages.spreadsheetRedo}
                variant="ghost"
                size="sm"
                isDisabled={!canRedo}
                onPress={onRedo}
              />
            </>
          )}
          {onAddRow &&
            (isPhone ? (
              <IconButton
                icon={BetweenHorizontalEnd}
                aria-label={messages.spreadsheetAddRow}
                variant="ghost"
                size="sm"
                onPress={onAddRow}
              />
            ) : (
              <Button variant="outline" size="sm" icon={Plus} onPress={onAddRow}>
                {messages.spreadsheetAddRow}
              </Button>
            ))}
          {onAddColumn &&
            (isPhone ? (
              <IconButton
                icon={BetweenVerticalEnd}
                aria-label={messages.spreadsheetAddColumn}
                variant="ghost"
                size="sm"
                onPress={onAddColumn}
              />
            ) : (
              <Button variant="outline" size="sm" icon={Plus} onPress={onAddColumn}>
                {messages.spreadsheetAddColumn}
              </Button>
            ))}
          <MenuButton
            label={messages.columns}
            icon={Columns3}
            variant="outline"
            size="sm"
            onAction={(key) => {
              if (key === SHOW_ALL) {
                onHiddenColumnsChange(new Set());
              }
            }}
          >
            <MenuSection
              aria-label={messages.columns}
              selectionMode="multiple"
              selectedKeys={visibleKeys}
              onSelectionChange={(keys: Selection) => {
                setVisible(keys === 'all' ? columns.map((column) => column.id) : keys);
              }}
              shouldCloseOnSelect={false}
            >
              {columns.map((column) => (
                <MenuItem key={column.id} id={column.id}>
                  {column.label}
                </MenuItem>
              ))}
            </MenuSection>
            <MenuSeparator />
            <MenuItem id={SHOW_ALL} isDisabled={hiddenColumns.size === 0}>
              {messages.spreadsheetShowAllColumns}
            </MenuItem>
          </MenuButton>
          <OverflowMenu
            size="sm"
            isOpen={isActionsOpen}
            onOpenChange={(isOpen) => {
              setActionsOpen(isOpen);
              if (isOpen) {
                setOpenedActions(true);
              }
            }}
            onAction={onAction}
          >
            {isActionsOpen || hasOpenedActions ? renderActions() : []}
          </OverflowMenu>
        </div>
      </div>
      {(hasChips || isStale) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {sortText !== undefined && (
            <Chip size="sm" onRemove={onClearSort}>
              {sortText}
            </Chip>
          )}
          {filterChips.map((chip) => (
            <Chip
              key={chip.id}
              size="sm"
              onRemove={() => {
                onRemoveFilter(chip.id);
              }}
            >
              {chip.text}
            </Chip>
          ))}
          {hasChips && (
            <Button variant="link" size="sm" onPress={onClearAll}>
              {messages.clearAll}
            </Button>
          )}
          {isStale && (
            <span className="ms-auto flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              {messages.spreadsheetReapplyHint}
              <Button variant="outline" size="sm" icon={RefreshCw} onPress={onReapply}>
                {messages.spreadsheetReapply}
              </Button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
