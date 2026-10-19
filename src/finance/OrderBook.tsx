// OrderBook: the resting orders on both sides of a market, as a table. Asks sit above and bids below a spread row
// (the spread and the mid price), each row with a size bar behind it. Updates are batched per animation frame, so a
// feed of 20 updates a second costs at most one render per frame. A level whose size changes flashes briefly (not with
// reduced motion) and shows ▲ or ▼ for a moment, so the cue isn't colour or motion alone. Pressing a level reports
// its price (to fill an order ticket). The best prices are read aloud on request, never on every tick.

import { Volume2 } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { Button as AriaButton, useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { Option } from '../components/ListBox/ListBoxParts';
import { Select } from '../components/Select/Select';
import { cn } from '../utils/cn';
import { useDeadlineTimer } from '../utils/timers';
import { useControllableState } from '../utils/useControllableState';
import { useLatest } from '../utils/useLatest';
import { decimalCompare } from '../components/MoneyField/decimal';
import {
  decimalMax,
  decimalScale,
  maxScale,
  resolveSide,
  spreadAndMid,
  type BookLevel,
  type BookSide,
  type ResolvedLevel,
} from './book';
import { formatDecimal, formatPrice, type PriceFormat } from './format';
import { useFinanceMessages, type FinanceStrings } from './messages';

export interface OrderBookProps {
  /** The bids, in any order (shown best first). */
  bids: readonly BookLevel[];
  /** The asks, in any order (shown best nearest the spread). */
  asks: readonly BookLevel[];
  /** Price grouping (tick aggregation), such as "0.01", "0.1" or "1", controlled. Ungrouped when missing. */
  grouping?: string;
  /** The initial grouping, uncontrolled. */
  defaultGrouping?: string;
  /** Groupings offered in a Select above the book. */
  groupingOptions?: readonly string[];
  /** Called with the grouping chosen from `groupingOptions`. */
  onGroupingChange?: (grouping: string) => void;
  /** Levels shown per side. Defaults to 10. */
  depth?: number;
  /** Makes each level pressable, reporting its side and (grouped) price, for example to fill an order ticket. */
  onLevelPress?: (side: BookSide, price: string) => void;
  /** The quote currency, shown in the price column's header ("USD"). */
  currency?: string;
  /** `price` for exchanges; `probability` for prediction markets (0–1 prices shown as %). Defaults to `price`. */
  priceFormat?: PriceFormat;
  /** Names the table. Defaults to the `orderBookLabel` message. */
  'aria-label'?: string;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

/** How long a changed level flashes, and how long its ▲/▼ stays. */
const FLASH_MS = 300;
const ARROW_MS = 1500;

interface Mark {
  direction: 'up' | 'down';
  isFlashing: boolean;
  flashUntil: number;
  arrowUntil: number;
}

interface BookView {
  bids: ResolvedLevel[];
  asks: ResolvedLevel[];
}

interface ViewOptions {
  grouping?: string;
  depth: number;
}

function resolveView(
  { bids, asks }: { bids: readonly BookLevel[]; asks: readonly BookLevel[] },
  options: ViewOptions,
): BookView {
  return {
    bids: resolveSide(bids, 'bid', options),
    asks: resolveSide(asks, 'ask', options),
  };
}

function levelKey(side: BookSide, price: string): string {
  return `${side}:${price}`;
}

/**
 * The levels whose size changed between two views of the book (with the same grouping): `up` for a bigger size or a
 * new level, `down` for a smaller one. Removed levels aren't shown, so they aren't marked.
 */
export function diffBook(previous: BookView, next: BookView): Map<string, 'up' | 'down'> {
  const changes = new Map<string, 'up' | 'down'>();
  for (const side of ['bid', 'ask'] as const) {
    const before = new Map(
      (side === 'bid' ? previous.bids : previous.asks).map((level) => [level.price, level.size]),
    );
    for (const level of side === 'bid' ? next.bids : next.asks) {
      const old = before.get(level.price);
      if (old === undefined) {
        changes.set(levelKey(side, level.price), 'up');
        continue;
      }
      const order = decimalCompare(level.size, old);
      if (order !== 0) {
        changes.set(levelKey(side, level.price), order > 0 ? 'up' : 'down');
      }
    }
  }
  return changes;
}

/** Ends flashes and removes arrows whose time is up. Returns the same map when nothing changed. */
function pruneMarks(marks: ReadonlyMap<string, Mark>, now: number): ReadonlyMap<string, Mark> {
  let next: Map<string, Mark> | null = null;
  for (const [key, mark] of marks) {
    if (mark.arrowUntil <= now) {
      next ??= new Map(marks);
      next.delete(key);
    } else if (mark.isFlashing && mark.flashUntil <= now) {
      next ??= new Map(marks);
      next.set(key, { ...mark, isFlashing: false });
    }
  }
  return next ?? marks;
}

const sideClasses: Record<BookSide, { price: string; bar: string }> = {
  bid: { price: 'text-success-fg', bar: 'bg-success-bg' },
  ask: { price: 'text-danger-fg', bar: 'bg-danger-bg' },
};

interface RowProps {
  side: BookSide;
  level: ResolvedLevel;
  priceText: string;
  sizeText: string;
  totalText: string;
  /** The size bar's width, 0–100. */
  barPercent: number;
  mark: Mark | undefined;
  onPress?: (side: BookSide, price: string) => void;
  messages: FinanceStrings;
}

const cellClasses = 'px-2 py-0 align-middle whitespace-nowrap';
// Each content span sits above the size bar; it lets presses through to the row's button.
const contentClasses = 'pointer-events-none relative';

function LevelRow({
  side,
  level,
  priceText,
  sizeText,
  totalText,
  barPercent,
  mark,
  onPress,
  messages,
}: RowProps) {
  const name =
    side === 'bid'
      ? messages.orderBookBidAt({ price: priceText })
      : messages.orderBookAskAt({ price: priceText });
  const price = (
    <span className={cn(contentClasses, 'inline-flex items-center gap-1.5')}>
      <span className="sr-only">{name}</span>
      <span aria-hidden="true">{priceText}</span>
      {level.isOwn && (
        <>
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent-solid" />
          <span className="sr-only">{messages.orderBookOwnOrder}</span>
        </>
      )}
    </span>
  );
  return (
    <tr
      data-side={side}
      data-changed={mark?.direction}
      className={cn(
        // The row is the positioning box for the size bar and the press target.
        'relative h-[max(1.75rem,var(--hit-size))]',
        // The flash turns on at once and fades out (reduced motion: no flash, and durations are zero).
        'motion-safe:transition-colors',
        mark?.isFlashing ? 'duration-0 motion-safe:bg-accent-bg' : 'duration-700',
      )}
    >
      <th
        scope="row"
        className={cn(cellClasses, 'text-start font-medium', sideClasses[side].price)}
      >
        <span
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-y-0.5 end-0', sideClasses[side].bar)}
          // The bar's width is the level's size relative to the largest shown (dynamic geometry).
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{ width: `${String(barPercent)}%` }}
        />
        {onPress === undefined ? (
          price
        ) : (
          <AriaButton
            onPress={() => {
              onPress(side, level.price);
            }}
            className={cn(
              'cursor-pointer outline-none',
              // The press target and focus ring cover the whole row.
              'after:absolute after:inset-0 after:rounded-control',
              'data-hovered:after:bg-fg/5',
              'data-focus-visible:after:outline-2 data-focus-visible:after:-outline-offset-2 data-focus-visible:after:outline-focus data-focus-visible:after:outline-solid',
            )}
          >
            {price}
          </AriaButton>
        )}
      </th>
      <td className={cn(cellClasses, 'text-end text-fg')}>
        <span className={cn(contentClasses, 'inline-flex items-center justify-end gap-0.5')}>
          {sizeText}
          {/* A fixed slot, so sizes don't shift when an arrow comes and goes. */}
          <span className="inline-block w-3 text-center text-[0.625rem] text-fg-muted">
            {mark !== undefined && (
              <>
                <span aria-hidden="true">{mark.direction === 'up' ? '▲' : '▼'}</span>
                <span className="sr-only">
                  {mark.direction === 'up' ? messages.orderBookSizeUp : messages.orderBookSizeDown}
                </span>
              </>
            )}
          </span>
        </span>
      </td>
      <td className={cn(cellClasses, 'text-end text-fg-muted')}>
        <span className={contentClasses}>{totalText}</span>
      </td>
    </tr>
  );
}

interface TableProps {
  view: BookView;
  marks: ReadonlyMap<string, Mark>;
  priceDigits: number;
  priceFormat: PriceFormat;
  currency?: string;
  label: string;
  onLevelPress?: (side: BookSide, price: string) => void;
}

/** The table itself, memoised so it renders once per animation frame however often the props change. */
const BookTable = memo(function BookTable({
  view,
  marks,
  priceDigits,
  priceFormat,
  currency,
  label,
  onLevelPress,
}: TableProps) {
  const messages = useFinanceMessages();
  const { locale } = useLocale();
  const all = [...view.asks, ...view.bids];
  const sizeDigits = maxScale(all.flatMap((level) => [level.size, level.total]));
  const largest = Number(decimalMax(all.map((level) => level.size)) ?? '0');
  const price = (value: string) =>
    formatPrice(value, locale, { format: priceFormat, digits: priceDigits });
  const quoted = spreadAndMid(view.bids[0]?.price, view.asks[0]?.price);

  const row = (side: BookSide, level: ResolvedLevel) => (
    <LevelRow
      key={level.price}
      side={side}
      level={level}
      priceText={price(level.price)}
      sizeText={formatDecimal(level.size, locale, sizeDigits)}
      totalText={formatDecimal(level.total, locale, sizeDigits)}
      barPercent={largest > 0 ? Math.min(100, (Number(level.size) / largest) * 100) : 0}
      mark={marks.get(levelKey(side, level.price))}
      onPress={onLevelPress}
      messages={messages}
    />
  );
  const empty = (text: string) => (
    <tr className="h-[max(1.75rem,var(--hit-size))]">
      <td colSpan={3} className={cn(cellClasses, 'text-center text-fg-muted')}>
        {text}
      </td>
    </tr>
  );

  return (
    <table className="w-full border-collapse text-sm tabular-nums">
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr className="border-b border-border text-xs text-fg-muted">
          <th scope="col" className={cn(cellClasses, 'py-1.5 text-start font-medium')}>
            {messages.orderBookPrice({ currency })}
          </th>
          <th scope="col" className={cn(cellClasses, 'py-1.5 pe-5 text-end font-medium')}>
            {messages.orderBookSize}
          </th>
          <th scope="col" className={cn(cellClasses, 'py-1.5 text-end font-medium')}>
            {messages.orderBookTotal}
          </th>
        </tr>
      </thead>
      <tbody>
        {view.asks.length === 0
          ? empty(messages.orderBookNoAsks)
          : // The best ask sits next to the spread, so asks run from the highest price down.
            [...view.asks].reverse().map((level) => row('ask', level))}
      </tbody>
      <tbody>
        <tr className="border-y border-border bg-surface-2">
          <th
            scope="row"
            className={cn(cellClasses, 'py-1.5 text-start text-xs font-medium text-fg-muted')}
          >
            {messages.orderBookSpread}
          </th>
          <td colSpan={2} className={cn(cellClasses, 'py-1.5 text-end text-xs text-fg')}>
            {quoted === null
              ? messages.orderBookNone
              : messages.orderBookSpreadValue({
                  spread: price(quoted.spread),
                  mid: formatPrice(quoted.mid, locale, {
                    format: priceFormat,
                    digits: Math.max(priceDigits, decimalScale(quoted.mid)),
                  }),
                })}
          </td>
        </tr>
      </tbody>
      <tbody>
        {view.bids.length === 0
          ? empty(messages.orderBookNoBids)
          : view.bids.map((level) => row('bid', level))}
      </tbody>
    </table>
  );
});

/**
 * An order book: asks above, bids below, and the spread and mid price between them, with size bars, a price
 * grouping Select, and pressable levels. Changed sizes flash and show ▲/▼ for a moment. Built for live feeds: props
 * can change many times a second and the table renders at most once per animation frame. "Read best prices"
 * announces the best bid, best ask and spread on request.
 */
export function OrderBook({
  bids,
  asks,
  grouping: groupingProp,
  defaultGrouping,
  groupingOptions,
  onGroupingChange,
  depth = 10,
  onLevelPress,
  currency,
  priceFormat = 'price',
  'aria-label': ariaLabel,
  className,
  ref,
}: OrderBookProps) {
  const messages = useFinanceMessages();
  const { locale } = useLocale();
  const [grouping, setGrouping] = useControllableState(
    groupingProp,
    defaultGrouping,
    onGroupingChange as ((value: string | undefined) => void) | undefined,
  );

  // The book as last rendered. New props are collected and applied on the next animation frame.
  const [frame, setFrame] = useState({ bids, asks });
  const [marks, setMarks] = useState<ReadonlyMap<string, Mark>>(() => new Map());
  const latest = useRef({ bids, asks });
  const frameRequest = useRef<number | null>(null);
  const options: ViewOptions = useMemo(() => ({ grouping, depth }), [grouping, depth]);
  const view = useMemo(() => resolveView(frame, options), [frame, options]);
  const shown = useLatest({ view, options });

  useEffect(() => {
    if (latest.current.bids === bids && latest.current.asks === asks) {
      return;
    }
    latest.current = { bids, asks };
    if (frameRequest.current !== null) {
      return;
    }
    frameRequest.current = requestAnimationFrame(() => {
      frameRequest.current = null;
      const next = latest.current;
      const changes = diffBook(shown.current.view, resolveView(next, shown.current.options));
      setFrame(next);
      if (changes.size > 0) {
        const now = performance.now();
        setMarks((previous) => {
          const merged = new Map(previous);
          for (const [key, direction] of changes) {
            merged.set(key, {
              direction,
              isFlashing: true,
              flashUntil: now + FLASH_MS,
              arrowUntil: now + ARROW_MS,
            });
          }
          return merged;
        });
      }
    });
  }, [bids, asks, shown]);

  useEffect(
    () => () => {
      if (frameRequest.current !== null) {
        cancelAnimationFrame(frameRequest.current);
      }
    },
    [],
  );

  // One timer for every mark: it fires at the next flash end or arrow expiry. Each firing bumps `markTick`, so the
  // timer is set again even when it fired a moment early and nothing was due yet (the marks would be unchanged).
  const [markTick, setMarkTick] = useState(0);
  const markTimer = useDeadlineTimer(() => {
    setMarks((previous) => pruneMarks(previous, performance.now()));
    setMarkTick((tick) => tick + 1);
  });
  useEffect(() => {
    let next = Number.POSITIVE_INFINITY;
    for (const mark of marks.values()) {
      next = Math.min(next, mark.isFlashing ? mark.flashUntil : mark.arrowUntil);
    }
    if (next === Number.POSITIVE_INFINITY) {
      markTimer.clear();
    } else {
      markTimer.start(Math.max(0, next - performance.now()));
    }
  }, [marks, markTick, markTimer]);

  // Marks belong to one grouping; a new grouping starts clean.
  const [markedGrouping, setMarkedGrouping] = useState(grouping);
  if (markedGrouping !== grouping) {
    setMarkedGrouping(grouping);
    setMarks(new Map());
  }

  const priceDigits =
    grouping === undefined
      ? maxScale([...view.bids, ...view.asks].map((level) => level.price))
      : decimalScale(grouping);
  const label = ariaLabel ?? messages.orderBookLabel;

  // "Read best prices": cleared first, so pressing it twice announces twice.
  const [announcement, setAnnouncement] = useState('');
  const announce = () => {
    const bestBid = view.bids[0]?.price;
    const bestAsk = view.asks[0]?.price;
    const quoted = spreadAndMid(bestBid, bestAsk);
    const price = (value: string | undefined) =>
      value === undefined
        ? messages.orderBookNone
        : formatPrice(value, locale, { format: priceFormat, digits: priceDigits });
    const text = messages.orderBookBestPrices({
      bid: price(bestBid),
      ask: price(bestAsk),
      spread: price(quoted?.spread),
    });
    setAnnouncement('');
    requestAnimationFrame(() => {
      setAnnouncement(text);
    });
  };

  // A stable press handler, so the memoised table doesn't re-render when the app passes a new function.
  const onLevelPressRef = useLatest(onLevelPress);
  const pressLevel = useCallback(
    (side: BookSide, price: string) => {
      onLevelPressRef.current?.(side, price);
    },
    [onLevelPressRef],
  );

  const hasGroupingSelect = groupingOptions !== undefined && groupingOptions.length > 0;

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        {hasGroupingSelect ? (
          <Select<object, string>
            label={messages.orderBookGrouping}
            value={grouping ?? null}
            onChange={setGrouping}
            size="sm"
            className="w-32"
          >
            {groupingOptions.map((option) => (
              <Option key={option} id={option} textValue={option}>
                {formatPrice(option, locale, {
                  format: priceFormat,
                  digits: decimalScale(option),
                })}
              </Option>
            ))}
          </Select>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" icon={Volume2} onPress={announce}>
          {messages.orderBookReadBest}
        </Button>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {/* Narrow containers scroll the table, never the page; `relative` keeps its sr-only text inside. */}
      <div className="relative min-w-0 overflow-x-auto">
        <BookTable
          view={view}
          marks={marks}
          priceDigits={priceDigits}
          priceFormat={priceFormat}
          currency={currency}
          label={label}
          onLevelPress={onLevelPress === undefined ? undefined : pressLevel}
        />
      </div>
    </div>
  );
}
