import { Columns3, Download, ListFilter } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useLocale, type Key, type Selection } from 'react-aria-components';
import { Badge } from '../components/Badge/Badge';
import { Button } from '../components/Button/Button';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { CheckboxGroup } from '../components/Checkbox/CheckboxGroup';
import { Chip } from '../components/Chip/Chip';
import { MenuItem, MenuSection } from '../components/Menu/Menu';
import { MenuButton } from '../components/Menu/MenuButtons';
import { Popover, PopoverTrigger } from '../components/Popover/Popover';
import { SearchField } from '../components/SearchField/SearchField';

import { cn } from '../utils/cn';
import { numberFormat } from '../utils/intl';
import { useElementWidth } from '../utils/useElementWidth';
import { useIsPhone } from '../utils/useMediaQuery';
import { columnLabel } from './columns';
import { NO_FILTERS } from './filterText';
import { activeFilters, FilterPanel } from './filters';
import type { DataTableColumn, ExportRequest, FilterConfig, FilterValues } from './types';
import { useTableMessages } from './messages';

export interface TableToolbarProps {
  /** What the rows are, for the summary ("Customers · 123"). */
  label?: string;
  /** The number of matching rows. */
  count?: number;
  /** The search text, controlled. Shows a search field when `onSearchChange` is given. */
  search?: string;
  onSearchChange?: (search: string) => void;
  /** The search field's accessible name. Defaults to the `search` message. */
  searchLabel?: string;
  filters?: readonly FilterConfig[];
  filterValues?: FilterValues;
  onFilterValuesChange?: (values: FilterValues) => void;
  /** The table's columns, for the column menu (with `onHiddenColumnsChange`). */
  columns?: readonly DataTableColumn<never>[];
  hiddenColumns?: ReadonlySet<string>;
  onHiddenColumnsChange?: (hidden: Set<string>) => void;
  /** Shows the export menu. "This page" can use `toCsv`; the app handles "All rows". */
  onExport?: (request: ExportRequest) => void;
  /** Leaves "All rows" out of the export menu. */
  isExportAllHidden?: boolean;
  /** The main action, such as "New customer". On phones it sticks to the bottom of the screen. */
  primaryAction?: ReactNode;
  className?: string;
}

/**
 * The controls above a DataTable: a result summary with the active filters as removable chips, a search field, a
 * filter panel, a column menu, an export menu and a primary action. Every value is controlled, so apps can keep
 * them in the URL. On phones the filters, columns and export share one "Filter & sort" sheet.
 */
export function TableToolbar({
  label,
  count,
  search,
  onSearchChange,
  searchLabel,
  filters = [],
  filterValues = NO_FILTERS,
  onFilterValuesChange,
  columns = [],
  hiddenColumns,
  onHiddenColumnsChange,
  onExport,
  isExportAllHidden = false,
  primaryAction,
  className,
}: TableToolbarProps) {
  const messages = useTableMessages();
  const { locale } = useLocale();
  const isPhone = useIsPhone();
  const [widthRef, width] = useElementWidth();
  const isCompact = (width ?? (isPhone ? 360 : 1280)) < 640;

  // The typed text is local; the app hears it debounced (and on Enter), and a new `search` from the app (such as
  // the URL on back navigation) replaces it.
  const [text, setText] = useState(search ?? '');
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setText(search ?? '');
  }

  const chips = activeFilters(filters, filterValues, messages, locale);
  const hideable = columns.filter((column) => column.isHideable ?? !column.isRowHeader);
  const hasFilters = filters.length > 0 && onFilterValuesChange !== undefined;
  const hasColumnMenu = hideable.length > 0 && onHiddenColumnsChange !== undefined;
  const hidden = hiddenColumns ?? new Set<string>();
  const visibleKeys = hideable
    .filter((column) => !hidden.has(column.id))
    .map((column) => column.id);

  const setVisible = (keys: Iterable<Key>) => {
    const visible = new Set([...keys].map(String));
    onHiddenColumnsChange?.(
      new Set(hideable.filter((column) => !visible.has(column.id)).map((column) => column.id)),
    );
  };

  const summary =
    label !== undefined && count !== undefined ? (
      <span className="text-sm font-medium whitespace-nowrap text-fg">
        {messages.resultSummary({ label, count: numberFormat(locale).format(count) })}
      </span>
    ) : null;

  const chipRow =
    chips.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <Chip
            key={chip.id}
            size="sm"
            onRemove={() => {
              onFilterValuesChange?.({ ...filterValues, [chip.id]: undefined });
            }}
          >
            {chip.text}
          </Chip>
        ))}
        <Button
          variant="link"
          size="sm"
          onPress={() => {
            onFilterValuesChange?.({});
          }}
        >
          {messages.clearAll}
        </Button>
      </div>
    ) : null;

  const searchField = onSearchChange ? (
    <SearchField
      aria-label={searchLabel ?? messages.search}
      value={text}
      onChange={setText}
      onSearch={onSearchChange}
      className={cn(isCompact ? 'w-full' : 'w-64 max-w-full')}
    />
  ) : null;

  const exportItems = (
    <>
      <MenuItem id="page">{messages.exportPage}</MenuItem>
      {!isExportAllHidden && <MenuItem id="all">{messages.exportAll}</MenuItem>}
    </>
  );

  if (isCompact) {
    const hasSheet = hasFilters || hasColumnMenu || onExport !== undefined;
    return (
      <div ref={widthRef} className={cn('flex min-w-0 flex-col gap-2', className)}>
        {searchField}
        <div className="flex items-center justify-between gap-2">
          {summary}
          {hasSheet && (
            <PopoverTrigger>
              <Button variant="outline" size="sm" icon={ListFilter}>
                {messages.filterAndSort}
                {chips.length > 0 && (
                  <Badge tone="accent" size="sm">
                    {String(chips.length)}
                  </Badge>
                )}
              </Button>
              <Popover aria-label={messages.filterAndSort}>
                <div className="flex flex-col gap-6">
                  {hasFilters && (
                    <FilterPanel
                      filters={filters}
                      values={filterValues}
                      onChange={onFilterValuesChange}
                    />
                  )}
                  {hasColumnMenu && (
                    <CheckboxGroup
                      label={messages.columns}
                      value={visibleKeys}
                      onChange={setVisible}
                    >
                      {hideable.map((column) => (
                        <Checkbox key={column.id} value={column.id}>
                          {columnLabel(column)}
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  )}
                  {onExport && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        icon={Download}
                        onPress={() => {
                          onExport({ format: 'csv', scope: 'page' });
                        }}
                      >
                        {messages.exportPage}
                      </Button>
                      {!isExportAllHidden && (
                        <Button
                          variant="outline"
                          icon={Download}
                          onPress={() => {
                            onExport({ format: 'csv', scope: 'all' });
                          }}
                        >
                          {messages.exportAll}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Popover>
            </PopoverTrigger>
          )}
        </div>
        {chipRow}
        {primaryAction !== undefined && (
          <div className="sticky bottom-0 z-sticky -mx-4 border-t border-border bg-surface-1 px-4 pt-3 pb-[max(--spacing(3),env(safe-area-inset-bottom))] [&>*]:w-full">
            {primaryAction}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={widthRef} className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">{summary}</div>
        {searchField}
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters && (
            <PopoverTrigger>
              <Button variant="outline" size="sm" icon={ListFilter}>
                {messages.filters}
                {chips.length > 0 && (
                  <Badge tone="accent" size="sm">
                    {String(chips.length)}
                  </Badge>
                )}
              </Button>
              <Popover aria-label={messages.filters} placement="bottom end" className="w-80">
                <FilterPanel
                  filters={filters}
                  values={filterValues}
                  onChange={onFilterValuesChange}
                />
              </Popover>
            </PopoverTrigger>
          )}
          {hasColumnMenu && (
            <MenuButton label={messages.columns} icon={Columns3} variant="outline" size="sm">
              <MenuSection
                aria-label={messages.columns}
                selectionMode="multiple"
                selectedKeys={visibleKeys}
                onSelectionChange={(keys: Selection) => {
                  setVisible(keys === 'all' ? hideable.map((column) => column.id) : keys);
                }}
                shouldCloseOnSelect={false}
              >
                {hideable.map((column) => (
                  <MenuItem key={column.id} id={column.id}>
                    {columnLabel(column)}
                  </MenuItem>
                ))}
              </MenuSection>
            </MenuButton>
          )}
          {onExport && (
            <MenuButton
              label={messages.export}
              icon={Download}
              variant="outline"
              size="sm"
              onAction={(key) => {
                onExport({ format: 'csv', scope: key === 'all' ? 'all' : 'page' });
              }}
            >
              {exportItems}
            </MenuButton>
          )}
          {primaryAction}
        </div>
      </div>
      {chipRow}
    </div>
  );
}
