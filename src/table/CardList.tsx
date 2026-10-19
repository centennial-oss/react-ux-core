import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { IconButton } from '../components/IconButton/IconButton';
import { OverflowMenu } from '../components/Menu/MenuButtons';
import { Skeleton } from '../components/Skeleton/Skeleton';
import { SpinnerIcon } from '../components/Spinner/SpinnerIcon';

import { cn } from '../utils/cn';
import { columnLabel } from './columns';
import type { TreeRows } from './DataTable';
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
  /** Rows whose detail panel is open. */
  openDetails: ReadonlySet<string>;
  onToggleDetail: (id: string) => void;
  /** Tree rows: children become a nested list under their parent's card. */
  tree?: TreeRows<Row>;
  loadingRows: number;
  isBusy: boolean;
}

const cardClasses =
  'flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface-1 p-3 text-sm';

/**
 * Nested cards indent by 1rem a level, with a guide line, for the first three levels; deeper levels line up with the
 * third so cards stay readable at 360px.
 */
const MAX_CARD_INDENT_DEPTH = 3;

function mobileRole<Row>(column: DataTableColumn<Row>): DataTableColumn<Row>['mobile'] {
  return column.mobile ?? (column.isRowHeader ? 'title' : undefined);
}

/**
 * The phone layout: one card per row with its title, subtitle, status, the columns marked `mobile`, and its
 * actions. Selection checkboxes appear after Select (or while rows are selected). Tree rows nest: an open row's
 * children are a list under its card.
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
  openDetails,
  onToggleDetail,
  tree,
  loadingRows,
  isBusy,
}: CardListProps<Row>) {
  const messages = useTableMessages();
  const detailPrefix = useId();
  const childrenPrefix = useId();
  const [isSelecting, setSelecting] = useState(false);
  const rows = model.getRowModel().rows;
  const showSelection =
    selectionMode !== 'none' && (isSelecting || Object.keys(model.state.rowSelection).length > 0);
  const title = columns.find((column) => mobileRole(column) === 'title');
  const subtitle = columns.find((column) => mobileRole(column) === 'subtitle');
  const status = columns.find((column) => mobileRole(column) === 'status');
  const details = columns.filter((column) => mobileRole(column) === true);

  const renderRow = (row: (typeof rows)[number]): ReactNode => {
    const original = row.original;
    const href = getRowHref?.(original);
    const label = getRowLabel(original);
    // A group is checked when all its children are, and indeterminate when some are.
    const isSelected = row.getIsSelected() || (tree !== undefined && row.getIsAllSubRowsSelected());
    const isIndeterminate = tree !== undefined && !isSelected && row.getIsSomeSelected();
    const isExpanded = openDetails.has(row.id);
    const detailId = `${detailPrefix}-${row.id}`;
    const childrenId = `${childrenPrefix}-${row.id}`;
    const canExpand = tree?.canExpand(original) ?? false;
    const isTreeExpanded = canExpand && (tree?.isExpanded(row.id) ?? false);
    const childStatus = isTreeExpanded ? tree?.status(original) : undefined;
    const titleContent = title ? renderCell(title, original, row.index) : label;
    const content = (
      <>
        <div className="flex min-w-0 items-start gap-2">
          {canExpand && (
            <IconButton
              icon={ChevronRight}
              aria-label={messages.childRows({ row: label })}
              aria-expanded={isTreeExpanded}
              aria-controls={isTreeExpanded ? childrenId : undefined}
              variant="ghost"
              size="sm"
              className={cn('-my-1.5 -ms-1.5 transition-transform', isTreeExpanded && 'rotate-90')}
              onPress={() => {
                tree?.toggle(row.id);
              }}
            />
          )}
          {showSelection && (
            <Checkbox
              aria-label={messages.selectRow({ row: label })}
              isSelected={isSelected}
              isIndeterminate={isIndeterminate}
              onChange={(value) => {
                row.toggleSelected(value);
              }}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="min-w-0 font-medium wrap-anywhere text-fg">
              {href === undefined ? titleContent : <RowLink href={href}>{titleContent}</RowLink>}
            </span>
            {subtitle && (
              <span className="text-xs text-fg-muted">
                {renderCell(subtitle, original, row.index)}
              </span>
            )}
          </div>
          {status && <div className="shrink-0">{renderCell(status, original, row.index)}</div>}
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
                <dt className="text-fg-muted">{columnLabel(column as DataTableColumn<never>)}</dt>
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
                onToggleDetail(row.id);
              }}
            >
              {messages.details}
            </Button>
            {isExpanded && <div id={detailId}>{renderRowDetail(original)}</div>}
          </>
        )}
      </>
    );
    const cardProps = {
      'data-selected': isSelected || undefined,
      onClick: href === undefined ? undefined : activateRowLink,
      className: cn(
        cardClasses,
        'data-selected:border-accent-border data-selected:bg-accent-bg',
        href !== undefined && 'cursor-pointer',
      ),
    };
    if (!tree) {
      return (
        // A pointer convenience only (`onClick`): the card's title is a real link for keyboard and screen readers.
        <li key={row.id} {...cardProps}>
          {content}
        </li>
      );
    }
    return (
      <li key={row.id} className="flex min-w-0 flex-col gap-2">
        <div {...cardProps}>{content}</div>
        {isTreeExpanded && (
          <ul
            id={childrenId}
            aria-label={messages.childRows({ row: label })}
            aria-busy={childStatus === 'loading' || undefined}
            className={cn(
              'flex min-w-0 flex-col gap-2',
              row.depth < MAX_CARD_INDENT_DEPTH && 'ms-1.5 border-s-2 border-border ps-2.5',
            )}
          >
            {childStatus === 'ready' ? (
              row.subRows.map(renderRow)
            ) : (
              <li className="flex flex-wrap items-center gap-2 px-1 py-2 text-sm text-fg-muted">
                {childStatus === 'loading' ? (
                  <>
                    <SpinnerIcon className="size-4" />
                    {messages.loading}
                  </>
                ) : (
                  <>
                    <span className="text-danger-fg">{messages.childRowsFailed}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        tree.retry(row.id);
                      }}
                    >
                      {messages.retry}
                    </Button>
                  </>
                )}
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

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
            <Skeleton shape="text" lineCount={2} />
          </li>
        ))}
        {(tree ? rows.filter((row) => row.depth === 0) : rows).map(renderRow)}
      </ul>
    </div>
  );
}
