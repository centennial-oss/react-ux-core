// The rows a Spreadsheet shows: the ids of the rows that match the search and filters, in sort order. Only ids are
// kept (no copies of rows or values), and only while a search, filter or sort applies; otherwise the view is the rows
// themselves.

import type { FilterValues, TableSort } from '../types';
import type { SpreadsheetRow } from './types';
import { isEmptyValue, isFilterActive, matchesFilter, type ColumnFormat } from './values';

export interface ViewCriteria {
  search: string;
  filterValues: FilterValues;
  sorting: readonly TableSort[];
}

/** Whether any search, filter or sort applies. */
export function isViewActive(
  criteria: ViewCriteria,
  formats: ReadonlyMap<string, ColumnFormat>,
): boolean {
  return (
    criteria.search.trim() !== '' ||
    criteria.sorting.some((sort) => formats.has(sort.column)) ||
    Object.entries(criteria.filterValues).some(
      ([id, value]) => formats.has(id) && isFilterActive(value),
    )
  );
}

/**
 * The ids of the rows in view, in order. `searchColumns` are the columns search looks in (the visible ones). Sorting
 * is stable and puts empty values last in either direction.
 */
export function computeView(
  rows: readonly SpreadsheetRow[],
  getRowId: (row: SpreadsheetRow) => string,
  formats: ReadonlyMap<string, ColumnFormat>,
  searchColumns: readonly ColumnFormat[],
  criteria: ViewCriteria,
): string[] {
  const term = criteria.search.trim().toLowerCase();
  const filters = Object.entries(criteria.filterValues).flatMap(([id, value]) => {
    const format = formats.get(id);
    return format && value !== undefined && isFilterActive(value) ? [{ format, value }] : [];
  });

  let indexes: number[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!row) {
      continue;
    }
    if (filters.some(({ format, value }) => !matchesFilter(format, row[format.column.id], value))) {
      continue;
    }
    if (
      term !== '' &&
      !searchColumns.some((format) => format.search(row[format.column.id]).includes(term))
    ) {
      continue;
    }
    indexes.push(index);
  }

  const sorts = criteria.sorting.flatMap((sort) => {
    const format = formats.get(sort.column);
    return format ? [{ format, sign: sort.direction === 'ascending' ? 1 : -1 }] : [];
  });
  if (sorts.length > 0) {
    indexes = indexes.sort((a, b) => {
      const rowA = rows[a];
      const rowB = rows[b];
      for (const { format, sign } of sorts) {
        const valueA = rowA?.[format.column.id] ?? null;
        const valueB = rowB?.[format.column.id] ?? null;
        const emptyA = isEmptyValue(valueA);
        const emptyB = isEmptyValue(valueB);
        if (emptyA || emptyB) {
          if (emptyA !== emptyB) {
            return emptyA ? 1 : -1;
          }
          continue;
        }
        const order = format.compare(valueA, valueB);
        if (order !== 0) {
          return order * sign;
        }
      }
      return a - b;
    });
  }

  return indexes.flatMap((index) => {
    const row = rows[index];
    return row ? [getRowId(row)] : [];
  });
}
