import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { Option } from '../components/ListBox/ListBoxParts';
import { Select } from '../components/Select/Select';

import { cn } from '../utils/cn';
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

/** Range text and previous/next buttons for client, offset and cursor paging; "Load more" on phones. */
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
  const { locale } = useLocale();
  const format = (value: number) => new Intl.NumberFormat(locale).format(value);

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

  let range: string;
  let hasPrevious: boolean;
  let hasNext: boolean;
  let previous: () => void;
  let next: () => void;
  if (pagination.mode === 'cursor') {
    range =
      pagination.approximateTotal === undefined
        ? messages.rowCount({ count: pageRowCount })
        : messages.approximateRows({ total: format(pagination.approximateTotal) });
    hasPrevious = pagination.hasPrevious;
    hasNext = pagination.hasNext;
    previous = pagination.onPrevious;
    next = pagination.onNext;
  } else {
    const isClient = pagination.mode === 'client';
    const pageIndex = isClient ? clientPageIndex : pagination.pageIndex;
    const total = isClient ? totalRowCount : pagination.total;
    const start = total === 0 ? 0 : pageIndex * pagination.pageSize + 1;
    const end = Math.min(total, pageIndex * pagination.pageSize + pageRowCount);
    range = messages.rowRange({ start: format(start), end: format(end), total: format(total) });
    hasPrevious = pageIndex > 0;
    hasNext = end < total;
    const go = isClient ? onClientPageChange : pagination.onPageChange;
    previous = () => {
      go(pageIndex - 1);
    };
    next = () => {
      go(pageIndex + 1);
    };
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-fg-muted',
      )}
    >
      {pagination.mode === 'offset' &&
        pagination.pageSizeOptions &&
        pagination.onPageSizeChange &&
        !isCompact && (
          <Select
            label={messages.rowsPerPage}
            labelPosition="side"
            size="sm"
            value={String(pagination.pageSize)}
            onChange={(key) => {
              pagination.onPageSizeChange?.(Number(key));
            }}
            isDisabled={isDisabled}
            className="w-auto"
          >
            {pagination.pageSizeOptions.map((size) => (
              <Option key={size} id={String(size)}>
                {String(size)}
              </Option>
            ))}
          </Select>
        )}
      <span className="tabular-nums">{range}</span>
      <div className="flex gap-1">
        <IconButton
          icon={ChevronLeft}
          aria-label={messages.previousPage}
          variant="outline"
          size="sm"
          className="rtl:rotate-180"
          isDisabled={isDisabled || !hasPrevious}
          onPress={previous}
        />
        <IconButton
          icon={ChevronRight}
          aria-label={messages.nextPage}
          variant="outline"
          size="sm"
          className="rtl:rotate-180"
          isDisabled={isDisabled || !hasNext}
          onPress={next}
        />
      </div>
    </div>
  );
}
