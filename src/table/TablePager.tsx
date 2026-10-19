import { useContext, useMemo } from 'react';
import { Button } from '../components/Button/Button';
import { Pagination } from '../components/Pagination/Pagination';
import type { PaginationMessages } from '../components/Pagination/messages';
import { MessagesContext } from '../provider/context';

import type { TablePagination } from './types';
import { useTableMessages } from './messages';

export interface TablePagerProps {
  pagination: TablePagination;
  /** Rows on the current page. */
  pageRowCount: number;
  /** Every row the table has (client paging). */
  totalRowCount: number;
  /** The client page index (client paging). */
  clientPageIndex: number;
  onClientPageChange: (pageIndex: number) => void;
  /** Phones: a "Load more" button when the app supports appending. */
  isCompact: boolean;
  isDisabled: boolean;
}

/**
 * The table's pager: `Pagination` (without page numbers) for client, offset and cursor paging, worded in rows with
 * the table's strings; "Load more" on phones when the app appends pages.
 */
export function TablePager({
  pagination,
  pageRowCount,
  totalRowCount,
  clientPageIndex,
  onClientPageChange,
  isCompact,
  isDisabled,
}: TablePagerProps) {
  const messages = useTableMessages();
  const provided = useContext(MessagesContext);
  // Pagination reads its strings from context, so the table's row-worded strings go in under Pagination's keys.
  const pagerMessages = useMemo(
    () =>
      ({
        ...provided,
        previousPage: messages.previousPage,
        nextPage: messages.nextPage,
        itemsPerPage: messages.rowsPerPage,
        itemRange: messages.rowRange,
        approximateItems: messages.approximateRows,
        itemCount: messages.rowCount,
      }) satisfies Partial<PaginationMessages>,
    [provided, messages],
  );

  if (isCompact && pagination.mode !== 'client' && pagination.onLoadMore) {
    const hasMore =
      pagination.mode === 'cursor'
        ? pagination.hasNext
        : (pagination.pageIndex + 1) * pagination.pageSize < pagination.total;
    return hasMore ? (
      <Button
        variant="outline"
        className="w-full"
        isDisabled={isDisabled}
        onPress={pagination.onLoadMore}
      >
        {messages.loadMore}
      </Button>
    ) : null;
  }

  return (
    <MessagesContext.Provider value={pagerMessages}>
      {pagination.mode === 'cursor' ? (
        <Pagination
          mode="cursor"
          hasNext={pagination.hasNext}
          hasPrevious={pagination.hasPrevious}
          onNext={pagination.onNext}
          onPrevious={pagination.onPrevious}
          approximateTotal={pagination.approximateTotal}
          pageItemCount={pageRowCount}
          isCompact={isCompact}
          isDisabled={isDisabled}
        />
      ) : pagination.mode === 'client' ? (
        <Pagination
          mode="offset"
          pageIndex={clientPageIndex}
          pageSize={pagination.pageSize}
          total={totalRowCount}
          onPageIndexChange={onClientPageChange}
          pageItemCount={pageRowCount}
          hasPageNumbers={false}
          isCompact={isCompact}
          isDisabled={isDisabled}
        />
      ) : (
        <Pagination
          mode="offset"
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageIndexChange={pagination.onPageIndexChange}
          pageSizeOptions={pagination.pageSizeOptions}
          onPageSizeChange={pagination.onPageSizeChange}
          pageItemCount={pageRowCount}
          hasPageNumbers={false}
          isCompact={isCompact}
          isDisabled={isDisabled}
        />
      )}
    </MessagesContext.Provider>
  );
}
