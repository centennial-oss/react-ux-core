import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { OverflowMenu } from '../components/Menu/MenuButtons';
import { Skeleton } from '../components/Skeleton/Skeleton';

import { cn } from '../utils/cn';
import { columnLabel } from './columns';
import type { TableModel } from './model';
import { activateRowLink, renderCell, RowLink } from './shared';
import type { DataTableColumn } from './types';
import { useTableMessages } from './messages';

export interface CardListProps<Row extends object> {
  model: TableModel<Row>;
  columns: readonly DataTableColumn<Row>[];
  'aria-label'?: string;
  'aria-labelledby'?: string;
  selectionMode: 'none' | 'single' | 'multiple';
  getRowLabel: (row: Row) => string;
  getRowHref?: (row: Row) => string | undefined;
  rowActions?: (row: Row) => ReactNode;
  onRowAction?: (key: Key, row: Row) => void;
  renderRowDetail?: (row: Row) => ReactNode;
  loadingRows: number;
  isBusy: boolean;
}

function mobileRole<Row>(column: DataTableColumn<Row>): DataTableColumn<Row>['mobile'] {
  return column.mobile ?? (column.isRowHeader ? 'title' : undefined);
}

/**
 * The phone layout: one card per row with its title, subtitle, status, the columns marked `mobile`, and its
 * actions. Selection checkboxes appear after Select (or while rows are selected).
 */
export function CardList<Row extends object>({
  model,
  columns,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  selectionMode,
  getRowLabel,
  getRowHref,
  rowActions,
  onRowAction,
  renderRowDetail,
  loadingRows,
  isBusy,
}: CardListProps<Row>) {
  const messages = useTableMessages();
  const detailPrefix = useId();
  const [isSelecting, setSelecting] = useState(false);
  const rows = model.getRowModel().rows;
  const showSelection =
    selectionMode !== 'none' && (isSelecting || Object.keys(model.state.rowSelection).length > 0);
  const title = columns.find((column) => mobileRole(column) === 'title');
  const subtitle = columns.find((column) => mobileRole(column) === 'subtitle');
  const status = columns.find((column) => mobileRole(column) === 'status');
  const details = columns.filter((column) => mobileRole(column) === true);

  return (
    <div className="flex flex-col gap-2">
      {selectionMode !== 'none' && rows.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          {showSelection && selectionMode === 'multiple' ? (
            <Checkbox
              isSelected={model.getIsAllPageRowsSelected()}
              isIndeterminate={model.getIsSomePageRowsSelected()}
              onChange={(isSelected) => {
                model.toggleAllPageRowsSelected(isSelected);
              }}
            >
              {messages.selectAllRows}
            </Checkbox>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              if (isSelecting) {
                model.resetRowSelection(true);
              }
              setSelecting(!isSelecting);
            }}
          >
            {isSelecting ? messages.cancel : messages.select}
          </Button>
        </div>
      )}
      <ul
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-busy={isBusy || undefined}
        className="flex flex-col gap-2"
      >
        {Array.from({ length: loadingRows }, (_, index) => (
          <li
            key={`loading-${String(index)}`}
            className="flex flex-col gap-2 rounded-card border border-border bg-surface-1 p-3"
          >
            <Skeleton shape="text" lines={2} />
          </li>
        ))}
        {rows.map((row) => {
          const original = row.original;
          const href = getRowHref?.(original);
          const label = getRowLabel(original);
          const isSelected = row.getIsSelected();
          const isExpanded = row.getIsExpanded();
          const detailId = `${detailPrefix}-${row.id}`;
          const titleContent = title ? renderCell(title, original, row.index) : label;
          return (
            // A pointer convenience only: the card's title is a real link for keyboard and screen readers.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- see above.
            <li
              key={row.id}
              data-selected={isSelected || undefined}
              onClick={href === undefined ? undefined : activateRowLink}
              className={cn(
                'flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface-1 p-3 text-sm',
                'data-selected:border-accent-border data-selected:bg-accent-bg',
                href !== undefined && 'cursor-pointer',
              )}
            >
              <div className="flex min-w-0 items-start gap-2">
                {showSelection && (
                  <Checkbox
                    aria-label={messages.selectRow({ row: label })}
                    isSelected={isSelected}
                    onChange={(value) => {
                      row.toggleSelected(value);
                    }}
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="min-w-0 font-medium wrap-anywhere text-fg">
                    {href === undefined ? (
                      titleContent
                    ) : (
                      <RowLink href={href}>{titleContent}</RowLink>
                    )}
                  </span>
                  {subtitle && (
                    <span className="text-xs text-fg-muted">
                      {renderCell(subtitle, original, row.index)}
                    </span>
                  )}
                </div>
                {status && (
                  <div className="shrink-0">{renderCell(status, original, row.index)}</div>
                )}
                {rowActions && (
                  <OverflowMenu
                    aria-label={messages.rowActions({ row: label })}
                    size="sm"
                    onAction={(key) => {
                      onRowAction?.(key, original);
                    }}
                  >
                    {rowActions(original)}
                  </OverflowMenu>
                )}
              </div>
              {details.length > 0 && (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                  {details.map((column) => (
                    <div key={column.id} className="contents">
                      <dt className="text-fg-muted">
                        {columnLabel(column as DataTableColumn<never>)}
                      </dt>
                      <dd className="min-w-0 wrap-anywhere text-fg">
                        {renderCell(column, original, row.index)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {renderRowDetail && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ChevronDown}
                    aria-expanded={isExpanded}
                    aria-controls={isExpanded ? detailId : undefined}
                    className="self-start"
                    onPress={() => {
                      row.toggleExpanded();
                    }}
                  >
                    {messages.details}
                  </Button>
                  {isExpanded && <div id={detailId}>{renderRowDetail(original)}</div>}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
