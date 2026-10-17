// LineItemsEditor: the lines of an invoice, quote or order, built on EditableTable and MoneyField's decimal helpers.
// Amounts are decimal strings throughout; totals come from `computeTotals` (half-even rounding per line). The
// read-only mode is a plain table with row and column headers, and both modes print as that table.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { ComboBox } from '../components/ComboBox/ComboBox';
import { Option } from '../components/ListBox/ListBoxParts';
import { decimalCompare, decimalNegate, isDecimal } from '../components/MoneyField/decimal';
import { MoneyField } from '../components/MoneyField/MoneyField';
import { currencyMinorUnits, formatMoney } from '../components/MoneyField/money';
import { NumberField } from '../components/NumberField/NumberField';
import { Select } from '../components/Select/Select';
import { TextField } from '../components/TextField/TextField';
import { cn } from '../utils/cn';
import { useDebouncedCallback } from '../utils/timers';
import type { EditableColumn, EditableTableErrors, EditorProps } from './editableColumns';
import { EditableTable } from './EditableTable';
import {
  computeTotals,
  discountText,
  parseDiscount,
  type LineItem,
  type LineItemDiscount,
  type LineItemsAdjustments,
  type LineItemsTotals,
  type TaxRate,
} from './lineItems';
import { useTableMessages, type TableEntryStrings } from './messages';
import { renderCell } from './shared';

/** A catalogue product offered while typing a description. */
export interface CatalogueProduct {
  id: string;
  label: string;
  /** The unit price in major units ("19.99"); choosing the product fills it in. */
  unitPrice: string;
}

export interface LineItemsEditorProps {
  items: readonly LineItem[];
  /** Called with the new lines after every edit. Not needed when `isReadOnly`. */
  onChange?: (items: LineItem[]) => void;
  /** The ISO 4217 currency of every amount ("USD"). */
  currency: string;
  taxRates?: readonly TaxRate[];
  /**
   * Product catalogue suggestions for the description: a ComboBox that loads as the user types (debounced, with the
   * signal aborted when a newer query starts). Choosing a product fills in its unit price.
   */
  loadProducts?: (query: string, signal: AbortSignal) => Promise<readonly CatalogueProduct[]>;
  /** Order-level discount and shipping. */
  adjustments?: LineItemsAdjustments;
  /** Makes the order discount and shipping editable. */
  onAdjustmentsChange?: (adjustments: LineItemsAdjustments) => void;
  /** The invoice view: a plain table with row and column headers and the totals, for showing and printing. */
  isReadOnly?: boolean;
  /** Shows a discount column (a percentage such as "10%" or an amount per line). */
  hasLineDiscounts?: boolean;
  /** Ids for new and duplicated lines. Defaults to ids unique within the page. */
  createId?: () => string;
  /** The add-line button turns off at this many lines. */
  maxItems?: number;
  /** Digits after the decimal point. Defaults to the currency's standard. */
  minorUnits?: number;
  /** Defaults to `always`: every line's fields show, like a form. */
  editMode?: 'cell' | 'always';
  /** Called (debounced) with the totals after they change, besides announcing the new total. */
  onTotalsChange?: (totals: LineItemsTotals) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const NO_TAX = '__none';

/** A cell value as text (strings and numbers; anything else is empty). */
function asText(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}
const TOTALS_ANNOUNCE_MS = 1000;

/** A product ComboBox for the description: typed text is the description; a chosen product fills the price. */
function ProductEditor({
  editor,
  loadProducts,
  currency,
  locale,
}: {
  editor: EditorProps<LineItem, string>;
  loadProducts: NonNullable<LineItemsEditorProps['loadProducts']>;
  currency: string;
  locale: string;
}) {
  // The products from the latest loads, to find the chosen one's price.
  const products = useRef(new Map<string, CatalogueProduct>());
  const load = useCallback(
    async (query: string, signal: AbortSignal) => {
      const result = await loadProducts(query, signal);
      for (const product of result) {
        products.current.set(product.id, product);
      }
      return result;
    },
    [loadProducts],
  );
  return (
    <ComboBox<CatalogueProduct>
      aria-label={editor['aria-label']}
      aria-describedby={editor['aria-describedby']}
      isInvalid={editor.isInvalid}
      isDisabled={editor.isDisabled}
      size="sm"
      allowsCustomValue
      menuTrigger="input"
      inputValue={editor.value}
      onInputChange={(text) => {
        editor.onChange(text);
      }}
      loadItems={load}
      onChange={(key) => {
        const product = key === null ? undefined : products.current.get(String(key));
        if (product) {
          editor.onRowChange({
            ...editor.row,
            description: product.label,
            unitPrice: product.unitPrice,
          });
        }
      }}
      className="w-full"
    >
      {(product) => (
        <Option
          id={product.id}
          textValue={product.label}
          description={formatMoney(product.unitPrice, currency, { locale })}
        >
          {product.label}
        </Option>
      )}
    </ComboBox>
  );
}

/** A discount typed as "10%" or "5.00", committed when the field is left or Enter is pressed. */
function DiscountField({
  value,
  onChange,
  label,
  isLabelVisible = false,
  description,
  invalidMessage,
  isDisabled,
  'aria-describedby': ariaDescribedBy,
  isInvalid,
}: {
  value: LineItemDiscount | undefined;
  onChange: (value: LineItemDiscount | undefined) => void;
  label: string;
  isLabelVisible?: boolean;
  description?: string;
  invalidMessage: string;
  isDisabled?: boolean;
  'aria-describedby'?: string;
  isInvalid?: boolean;
}) {
  const committed = discountText(value);
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? committed;
  const parsed = parseDiscount(shown);
  const commit = () => {
    if (parsed !== undefined) {
      setText(null);
      if (discountText(parsed ?? undefined) !== committed) {
        onChange(parsed ?? undefined);
      }
    }
  };
  return (
    <TextField
      {...(isLabelVisible ? { label } : { 'aria-label': label })}
      description={description}
      aria-describedby={ariaDescribedBy}
      size="sm"
      inputMode="decimal"
      value={shown}
      onChange={setText}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        }
      }}
      isInvalid={isInvalid === true || parsed === undefined}
      errorMessage={parsed === undefined ? invalidMessage : undefined}
      isDisabled={isDisabled}
      className="w-full"
    />
  );
}

function taxLabel(rate: TaxRate, messages: TableEntryStrings): string {
  return messages.lineItemsTaxRate({ label: rate.label, percent: rate.percent });
}

/**
 * The lines of an invoice, quote or order: description (with product suggestions), quantity, unit price, tax rate
 * and optional discount, with each line's amount and a totals block (subtotal, discount, tax by rate, shipping and
 * total), all decimal-safe with half-even rounding per line (see `computeTotals`). Lines can be added, duplicated,
 * reordered and removed with EditableTable's keyboard model. The total is announced when it changes. `isReadOnly`
 * shows the invoice view, which is also what prints.
 */
export function LineItemsEditor({
  items,
  onChange,
  currency,
  taxRates = [],
  loadProducts,
  adjustments = {},
  onAdjustmentsChange,
  isReadOnly = false,
  hasLineDiscounts = false,
  createId,
  maxItems,
  minorUnits,
  editMode = 'always',
  onTotalsChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: LineItemsEditorProps) {
  const messages = useTableMessages();
  const { locale } = useLocale();
  const idPrefix = useId();
  const nextId = useRef(1);
  const digits = minorUnits ?? currencyMinorUnits(currency);
  const totals = useMemo(
    () => computeTotals(items, taxRates, adjustments, { minorUnits: digits }),
    [items, taxRates, adjustments, digits],
  );
  const lineTotals = new Map(totals.lines.map((line) => [line.id, line]));
  const money = (value: string) => formatMoney(value, currency, { locale, minorUnits: digits });
  const label = ariaLabelledBy === undefined ? (ariaLabel ?? messages.lineItems) : undefined;
  const hasTax = taxRates.length > 0;

  // Announce the total (and report the totals) a moment after they settle.
  const [announcement, setAnnouncement] = useState('');
  const totalText = money(totals.total);
  const announce = useDebouncedCallback((text: string, latest: LineItemsTotals) => {
    setAnnouncement(messages.lineItemsTotalChanged({ total: text }));
    onTotalsChange?.(latest);
  }, TOTALS_ANNOUNCE_MS);
  const announced = useRef(totalText);
  const { run } = announce;
  useEffect(() => {
    if (announced.current !== totalText) {
      announced.current = totalText;
      run(totalText, totals);
    }
  }, [totalText, totals, run]);

  const newId = () => {
    if (createId) {
      return createId();
    }
    const id = `${idPrefix}-line-${String(nextId.current)}`;
    nextId.current += 1;
    return id;
  };

  const lineLabel = (item: LineItem, index: number) =>
    item.description.trim() === ''
      ? messages.lineItemsLine({ index: index + 1 })
      : item.description;

  const taxOptions = [
    { id: NO_TAX, label: messages.lineItemsNoTax },
    ...taxRates.map((rate) => ({ id: rate.id, label: taxLabel(rate, messages) })),
  ];
  const discountShown = (discount: LineItemDiscount | undefined) =>
    discount === undefined
      ? ''
      : discount.type === 'percent'
        ? `${discount.value}%`
        : money(discount.value);

  const columns: EditableColumn<LineItem>[] = [
    {
      id: 'description',
      header: messages.lineItemsDescription,
      isRowHeader: true,
      isRequired: true,
      isFlexible: true,
      minWidth: '12rem',
      value: (item) => item.description,
      setValue: (item, value) => ({ ...item, description: asText(value) }),
      editor: (editor) =>
        loadProducts ? (
          <ProductEditor
            editor={editor as EditorProps<LineItem, string>}
            loadProducts={loadProducts}
            currency={currency}
            locale={locale}
          />
        ) : (
          <TextField
            aria-label={editor['aria-label']}
            aria-describedby={editor['aria-describedby']}
            isInvalid={editor.isInvalid}
            isDisabled={editor.isDisabled}
            size="sm"
            value={asText(editor.value)}
            onChange={(text) => {
              editor.onChange(text);
            }}
            className="w-full"
          />
        ),
    },
    {
      id: 'quantity',
      header: messages.lineItemsQuantity,
      align: 'end',
      minWidth: '6rem',
      value: (item) => item.quantity,
      setValue: (item, value) => ({ ...item, quantity: asText(value) }),
      editor: (editor) => (
        <NumberField
          aria-label={editor['aria-label']}
          aria-describedby={editor['aria-describedby']}
          isInvalid={editor.isInvalid}
          isDisabled={editor.isDisabled}
          size="sm"
          minValue={0}
          value={isDecimal(editor.row.quantity) ? Number(editor.row.quantity) : null}
          onChange={(next) => {
            editor.onChange(next === null ? '' : String(next));
          }}
          className="w-full"
        />
      ),
    },
    {
      id: 'unitPrice',
      header: messages.lineItemsUnitPrice,
      align: 'end',
      minWidth: '8rem',
      value: (item) => item.unitPrice,
      setValue: (item, value) => ({ ...item, unitPrice: asText(value) }),
      cell: ({ row }) => (isDecimal(row.unitPrice) ? money(row.unitPrice) : row.unitPrice),
      editor: (editor) => (
        <MoneyField
          aria-label={editor['aria-label']}
          aria-describedby={editor['aria-describedby']}
          isInvalid={editor.isInvalid}
          isDisabled={editor.isDisabled}
          size="sm"
          currency={currency}
          minorUnits={digits}
          allowsNegative
          value={editor.row.unitPrice === '' ? null : editor.row.unitPrice}
          onChange={(next) => {
            editor.onChange(next ?? '');
          }}
          className="w-full"
        />
      ),
    },
    ...(hasTax
      ? [
          {
            id: 'tax',
            header: messages.lineItemsTax,
            minWidth: '9rem',
            value: (item: LineItem) => item.taxRateId,
            setValue: (item: LineItem, value: unknown) => {
              const { taxRateId: _taxRateId, ...rest } = item;
              return value === NO_TAX || value === undefined || value === null
                ? rest
                : { ...rest, taxRateId: asText(value) };
            },
            cell: ({ row }: { row: LineItem }) => {
              const rate = taxRates.find((candidate) => candidate.id === row.taxRateId);
              return rate ? taxLabel(rate, messages) : messages.lineItemsNoTax;
            },
            editor: (editor: EditorProps<LineItem, unknown>) => (
              <Select<object, string>
                aria-label={editor['aria-label']}
                aria-describedby={editor['aria-describedby']}
                isInvalid={editor.isInvalid}
                isDisabled={editor.isDisabled}
                size="sm"
                value={editor.row.taxRateId ?? NO_TAX}
                onChange={(next) => {
                  editor.onChange(next);
                }}
                className="w-full"
              >
                {taxOptions.map((option) => (
                  <Option key={option.id} id={option.id} textValue={option.label}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            ),
          } satisfies EditableColumn<LineItem>,
        ]
      : []),
    ...(hasLineDiscounts
      ? [
          {
            id: 'discount',
            header: messages.lineItemsDiscount,
            align: 'end' as const,
            minWidth: '7rem',
            value: (item: LineItem) => item.discount,
            setValue: (item: LineItem, value: unknown) => {
              const { discount: _discount, ...rest } = item;
              return value === undefined || value === null
                ? rest
                : { ...rest, discount: value as LineItemDiscount };
            },
            cell: ({ row }: { row: LineItem }) => discountShown(row.discount),
            editor: (editor: EditorProps<LineItem, unknown>) => (
              <DiscountField
                label={editor['aria-label']}
                aria-describedby={editor['aria-describedby']}
                isInvalid={editor.isInvalid}
                isDisabled={editor.isDisabled}
                invalidMessage={messages.lineItemsInvalidDiscount}
                value={editor.row.discount}
                onChange={(next) => {
                  editor.onChange(next);
                }}
              />
            ),
          } satisfies EditableColumn<LineItem>,
        ]
      : []),
    {
      id: 'amount',
      header: messages.lineItemsAmount,
      align: 'end',
      minWidth: '7rem',
      value: (item) => lineTotals.get(item.id)?.amount,
      cell: ({ value }) => (typeof value === 'string' ? money(value) : ''),
    },
  ];

  const validate = (rows: readonly LineItem[]): EditableTableErrors => {
    const errors: Record<string, Record<string, string>> = {};
    for (const item of rows) {
      const byColumn: Record<string, string> = {};
      if (!isDecimal(item.quantity) || decimalCompare(item.quantity, '0') < 0) {
        byColumn.quantity = messages.lineItemsInvalidQuantity;
      }
      if (!isDecimal(item.unitPrice)) {
        byColumn.unitPrice = messages.lineItemsInvalidPrice;
      }
      if (Object.keys(byColumn).length > 0) {
        errors[item.id] = byColumn;
      }
    }
    return errors;
  };

  const discountLabel =
    adjustments.discount?.type === 'percent'
      ? messages.lineItemsDiscountPercent({ percent: adjustments.discount.value })
      : messages.lineItemsDiscount;
  const hasDiscount =
    adjustments.discount !== undefined && decimalCompare(totals.discount, '0') !== 0;
  const hasShipping = decimalCompare(totals.shipping, '0') !== 0;

  /** The totals as label and amount pairs, shared by both views. */
  const totalRows: { key: string; label: string; amount: string; isTotal?: boolean }[] = [
    { key: 'subtotal', label: messages.lineItemsSubtotal, amount: money(totals.subtotal) },
    ...(hasDiscount
      ? [{ key: 'discount', label: discountLabel, amount: money(decimalNegate(totals.discount)) }]
      : []),
    ...totals.taxByRate.map((tax) => ({
      key: `tax-${tax.rateId}`,
      label: tax.isInclusive
        ? messages.lineItemsTaxIncluded({ label: tax.label, percent: tax.percent })
        : messages.lineItemsTaxRate({ label: tax.label, percent: tax.percent }),
      amount: money(tax.amount),
    })),
    ...(hasShipping
      ? [{ key: 'shipping', label: messages.lineItemsShipping, amount: money(totals.shipping) }]
      : []),
    { key: 'total', label: messages.lineItemsTotal, amount: totalText, isTotal: true },
  ];

  const isSecondary = (id: string) => id === 'tax' || id === 'discount';
  const secondaryColumns = columns.filter((column) => isSecondary(column.id));
  const secondaryClasses = 'hidden @lg:table-cell print:table-cell';

  const invoice = (
    <div className="@container w-full overflow-x-auto print:overflow-visible">
      <table
        aria-label={label}
        aria-labelledby={ariaLabelledBy}
        className="w-full border-collapse text-sm text-fg print:text-xs"
      >
        <thead>
          <tr className="border-b border-border-strong">
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  'px-2 py-2 align-bottom text-xs font-semibold text-fg-muted',
                  column.align === 'end' ? 'text-end' : 'text-start',
                  isSecondary(column.id) && secondaryClasses,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-b border-border print:break-inside-avoid">
              {columns.map((column) => {
                const content = renderCell(column, item, index);
                return column.isRowHeader ? (
                  <th
                    key={column.id}
                    scope="row"
                    className="min-w-24 px-2 py-2 text-start font-normal break-words"
                  >
                    {content}
                    {/* Narrow invoices fold the tax and discount columns into the description. */}
                    {secondaryColumns.map((secondary) => (
                      <span
                        key={secondary.id}
                        className="block text-xs text-fg-muted @lg:hidden print:hidden"
                      >
                        {renderCell(secondary, item, index)}
                      </span>
                    ))}
                  </th>
                ) : (
                  <td
                    key={column.id}
                    className={cn(
                      'px-2 py-2',
                      column.align === 'end' && 'text-end whitespace-nowrap tabular-nums',
                      isSecondary(column.id) && secondaryClasses,
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {totalRows.map((row) => (
            <tr key={row.key} className={cn(row.isTotal && 'border-t border-border-strong')}>
              {/* One label cell per layout (only one shows), so the amounts line up with the amount column. */}
              {[
                {
                  span: columns.length - 1 - secondaryColumns.length,
                  classes: '@lg:hidden print:hidden',
                },
                { span: columns.length - 1, classes: secondaryClasses },
              ].map((layout, index) =>
                layout.span > 0 && (index === 0 || secondaryColumns.length > 0) ? (
                  <th
                    key={index}
                    scope="row"
                    colSpan={layout.span}
                    className={cn(
                      'px-2 py-1.5 text-end',
                      row.isTotal ? 'font-semibold text-fg' : 'font-normal text-fg-muted',
                      secondaryColumns.length > 0 && layout.classes,
                    )}
                  >
                    {row.label}
                  </th>
                ) : null,
              )}
              <td
                className={cn(
                  'px-2 py-1.5 text-end whitespace-nowrap tabular-nums',
                  row.isTotal && 'font-semibold',
                )}
              >
                {row.amount}
              </td>
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );

  const liveRegion = (
    <span className="sr-only" aria-live="polite">
      {announcement}
    </span>
  );

  if (isReadOnly) {
    return (
      <div ref={ref} className={cn('flex min-w-0 flex-col text-sm text-fg', className)}>
        {invoice}
        {liveRegion}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-4 text-sm text-fg', className)}>
      <div className="flex min-w-0 flex-col gap-4 print:hidden">
        <EditableTable<LineItem>
          aria-label={label}
          aria-labelledby={ariaLabelledBy}
          rows={items}
          columns={columns}
          getRowId={(item) => item.id}
          getRowLabel={lineLabel}
          onChange={(next) => {
            onChange?.(next);
          }}
          validate={validate}
          newRow={() => ({
            id: newId(),
            description: '',
            quantity: '1',
            unitPrice: '0',
            ...(taxRates[0] ? { taxRateId: taxRates[0].id } : {}),
          })}
          duplicateRow={(item) => ({ ...item, id: newId() })}
          isReorderable
          maxRows={maxItems}
          minRows={0}
          editMode={editMode}
          addRowLabel={messages.lineItemsAddLine}
          minGridWidth={720}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-end">
          {onAdjustmentsChange !== undefined && (
            <div className="grid grid-cols-1 gap-3 sm:w-64">
              <DiscountField
                label={messages.lineItemsDiscount}
                isLabelVisible
                description={messages.lineItemsDiscountHint}
                invalidMessage={messages.lineItemsInvalidDiscount}
                value={adjustments.discount}
                onChange={(discount) => {
                  const { discount: _discount, ...rest } = adjustments;
                  onAdjustmentsChange(discount === undefined ? rest : { ...rest, discount });
                }}
              />
              <MoneyField
                label={messages.lineItemsShipping}
                size="sm"
                currency={currency}
                minorUnits={digits}
                value={adjustments.shipping ?? null}
                onChange={(shipping) => {
                  const { shipping: _shipping, ...rest } = adjustments;
                  onAdjustmentsChange(shipping === null ? rest : { ...rest, shipping });
                }}
              />
            </div>
          )}
          <section aria-label={messages.lineItemsTotals} className="w-full sm:max-w-xs">
            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
              {totalRows.map((row) => (
                <div
                  key={row.key}
                  className={cn(
                    'col-span-2 grid grid-cols-subgrid',
                    row.isTotal && 'mt-1 border-t border-border-strong pt-2 font-semibold',
                  )}
                >
                  <dt className={row.isTotal ? 'text-fg' : 'text-fg-muted'}>{row.label}</dt>
                  <dd className="text-end tabular-nums">{row.amount}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
      {/* What prints: the invoice view, without the editing controls. */}
      <div aria-hidden="true" className="hidden print:block">
        {invoice}
      </div>
      {liveRegion}
    </div>
  );
}
