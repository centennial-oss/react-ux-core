// English defaults of Pagination's strings. DataTable's pager passes its own row-worded strings in their place.

/** Strings for Pagination. */
export interface PaginationMessages {
  /** Names the pagination landmark. */
  pagination: string;
  /** The previous-page button. The same key as DataTable's. */
  previousPage: string;
  /** The next-page button. The same key as DataTable's. */
  nextPage: string;
  /** Labels the page-size choice. */
  itemsPerPage: string;
  /** The range shown, for example "1–25 of 1,203" (the numbers are already formatted). */
  itemRange: (params: { start: string; end: string; total: string }) => string;
  /** Cursor paging with an approximate total, for example "About 1,200 items". */
  approximateItems: (params: { total: string }) => string;
  /** Cursor paging with only the current page's count, for example "25 items". */
  itemCount: (params: { count: number }) => string;
  /** Names a page-number button, for example "Page 3". It ends with the visible number. */
  pageNumber: (params: { page: string }) => string;
}

export const defaultPaginationMessages: PaginationMessages = {
  pagination: 'Pagination',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  itemsPerPage: 'Items per page',
  itemRange: ({ start, end, total }) => `${start}–${end} of ${total}`,
  approximateItems: ({ total }) => `About ${total} items`,
  itemCount: ({ count }) => (count === 1 ? '1 item' : `${count} items`),
  pageNumber: ({ page }) => `Page ${page}`,
};
