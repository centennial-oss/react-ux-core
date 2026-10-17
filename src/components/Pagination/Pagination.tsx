import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useMemo, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useIsPhone } from '../../utils/useMediaQuery';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Option } from '../ListBox/ListBoxParts';
import { Select } from '../Select/Select';
import { defaultPaginationMessages } from './messages';

/** A slot in the page-number row: a page index (from 0) or a gap. */
export type PageItem = number | 'start-ellipsis' | 'end-ellipsis';

/**
 * The page numbers to show: every page when there are seven or fewer, otherwise the first, the last and the current
 * page with its neighbours, with an ellipsis for each gap. Always seven slots, so the row doesn't jump as you page.
 */
export function pageItems(pageCount: number, pageIndex: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: Math.max(0, pageCount) }, (_, index) => index);
  }
  const last = pageCount - 1;
  const current = Math.min(Math.max(pageIndex, 0), last);
  if (current <= 3) {
    return [0, 1, 2, 3, 4, 'end-ellipsis', last];
  }
  if (current >= last - 3) {
    return [0, 'start-ellipsis', last - 4, last - 3, last - 2, last - 1, last];
  }
  return [0, 'start-ellipsis', current - 1, current, current + 1, 'end-ellipsis', last];
}

interface PaginationBaseProps {
  /** Names the `nav` landmark. Defaults to the `pagination` message ("Pagination"). */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Disables every control, for example while a page loads. */
  isDisabled?: boolean;
  /** Hides the page numbers and the page-size choice. Defaults to true on phones. */
  isCompact?: boolean;
  /** How many items the current page holds, when it can hold fewer than a full page. */
  pageItemCount?: number;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** Offset paging: a known total, in pages of `pageSize`. */
export interface OffsetPaginationProps extends PaginationBaseProps {
  mode: 'offset';
  /** The current page, from 0. */
  pageIndex: number;
  pageSize: number;
  /** How many items there are in all. */
  total: number;
  onPageChange: (pageIndex: number) => void;
  /** Offers a page-size choice (with `onPageSizeChange`). */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Shows page-number buttons between previous and next. Defaults to true. */
  hasPageNumbers?: boolean;
}

/** Cursor (keyset) paging: only previous and next, with an optional approximate total. */
export interface CursorPaginationProps extends PaginationBaseProps {
  mode: 'cursor';
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  /** Shown as "About 1,200 items". */
  approximateTotal?: number;
}

export type PaginationProps = OffsetPaginationProps | CursorPaginationProps;

/**
 * Previous and next buttons with the range shown ("1–25 of 1,203"), for anything paged: offset paging adds page
 * numbers that collapse with an ellipsis, and an optional page-size choice; cursor paging shows only previous and
 * next. A `nav` landmark, with `aria-current="page"` on the current page. DataTable's pager is built on it.
 */
export function Pagination(props: PaginationProps) {
  const {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    isDisabled = false,
    pageItemCount,
    className,
    ref,
  } = props;
  const messages = useEntryMessages(defaultPaginationMessages);
  const pageSizeLabelId = useId();
  const isPhone = useIsPhone();
  const isCompact = props.isCompact ?? isPhone;
  const { locale } = useLocale();
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const format = (value: number) => numberFormat.format(value);

  let range: string;
  let hasPrevious: boolean;
  let hasNext: boolean;
  let previous: () => void;
  let next: () => void;
  let pages: PageItem[] = [];
  if (props.mode === 'cursor') {
    if (props.approximateTotal !== undefined) {
      range = messages.approximateItems({ total: format(props.approximateTotal) });
    } else {
      range = pageItemCount === undefined ? '' : messages.itemCount({ count: pageItemCount });
    }
    ({ hasPrevious, hasNext } = props);
    previous = props.onPrevious;
    next = props.onNext;
  } else {
    const { pageIndex, pageSize, total, onPageChange } = props;
    const start = total === 0 ? 0 : pageIndex * pageSize + 1;
    const end = Math.min(total, pageIndex * pageSize + (pageItemCount ?? pageSize));
    range = messages.itemRange({ start: format(start), end: format(end), total: format(total) });
    hasPrevious = pageIndex > 0;
    hasNext = end < total;
    previous = () => {
      onPageChange(pageIndex - 1);
    };
    next = () => {
      onPageChange(pageIndex + 1);
    };
    if ((props.hasPageNumbers ?? true) && !isCompact && pageSize > 0) {
      pages = pageItems(Math.ceil(total / pageSize), pageIndex);
    }
  }

  return (
    <nav
      ref={ref}
      aria-label={ariaLabelledBy === undefined ? (ariaLabel ?? messages.pagination) : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        'flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-fg-muted',
        className,
      )}
    >
      {props.mode === 'offset' && props.pageSizeOptions && props.onPageSizeChange && !isCompact && (
        // The label sits beside a fixed-width Select: a field root is a size container, so a Select sized by its
        // content (w-auto) in this row would collapse.
        <div className="flex items-center gap-2">
          <span id={pageSizeLabelId} className="font-medium whitespace-nowrap text-fg">
            {messages.itemsPerPage}
          </span>
          <Select
            aria-labelledby={pageSizeLabelId}
            size="sm"
            value={String(props.pageSize)}
            onChange={(key) => {
              props.onPageSizeChange?.(Number(key));
            }}
            isDisabled={isDisabled}
            className="w-20"
          >
            {props.pageSizeOptions.map((size) => (
              <Option key={size} id={String(size)}>
                {format(size)}
              </Option>
            ))}
          </Select>
        </div>
      )}
      {range !== '' && <span className="tabular-nums">{range}</span>}
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
        {props.mode === 'offset' &&
          pages.map((page) => {
            if (typeof page !== 'number') {
              return (
                <span
                  key={page}
                  aria-hidden="true"
                  className="flex h-8 min-w-6 items-center justify-center text-fg-muted"
                >
                  …
                </span>
              );
            }
            const isCurrent = page === props.pageIndex;
            return (
              <Button
                key={page}
                variant={isCurrent ? 'soft' : 'ghost'}
                tone={isCurrent ? 'accent' : 'neutral'}
                size="sm"
                aria-label={messages.pageNumber({ page: format(page + 1) })}
                aria-current={isCurrent ? 'page' : undefined}
                className="min-w-8 px-2 tabular-nums"
                isDisabled={isDisabled}
                onPress={() => {
                  if (!isCurrent) {
                    props.onPageChange(page);
                  }
                }}
              >
                {format(page + 1)}
              </Button>
            );
          })}
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
    </nav>
  );
}
