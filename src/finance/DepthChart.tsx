// DepthChart: the order book's cumulative size on each side of the mid price, as two step areas (bids rising to the
// left, asks to the right). It's a self-contained SVG rather than a `/chart` Chart.js chart, so `/finance` needs no
// optional peers. Like the other charts it has a title, a generated summary (the plot's description) and
// "View as table".

import { Table2 } from 'lucide-react';
import { useId, useMemo, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { ScrollRegion } from '../components/ScrollRegion/ScrollRegion';
import { Skeleton } from '../components/Skeleton/Skeleton';
import { cn } from '../utils/cn';
import { numberFormat } from '../utils/intl';
import { clamp } from '../utils/math';
import type { HeadingLevel } from '../utils/types';
import { useElementSize } from '../utils/useElementSize';
import {
  decimalScale,
  maxScale,
  resolveSide,
  spreadAndMid,
  type BookLevel,
  type ResolvedLevel,
} from './book';
import { formatDecimal, formatPrice, type PriceFormat } from './format';
import { useFinanceMessages } from './messages';

export interface DepthChartProps {
  bids: readonly BookLevel[];
  asks: readonly BookLevel[];
  /** The mid price line. Defaults to halfway between the best bid and the best ask. */
  midPrice?: string;
  /** Price grouping (tick aggregation), as for OrderBook. */
  grouping?: string;
  /** Levels used per side. Defaults to all. */
  depth?: number;
  /** `probability` shows 0–1 prices as percentages. Defaults to `price`. */
  priceFormat?: PriceFormat;
  /** Names the chart (its heading and the plot's accessible name). */
  title: string;
  description?: ReactNode;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Keeps the title for screen readers only (when the surrounding card already shows it). */
  isTitleHidden?: boolean;
  isLoading?: boolean;
  /** Loading failed: an error state, with Retry when `onRetry` is given. */
  error?: ReactNode;
  onRetry?: () => void;
  /** Shown when both sides are empty. Defaults to "No data". */
  emptyState?: ReactNode;
  /** Offers "View as table". Defaults to true. */
  hasTableToggle?: boolean;
  /** The plot's height on tablets and desktops (CSS), such as `16rem`. Phones use a 4:3 box. Defaults to `16rem`. */
  height?: string;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

/** Evenly spaced round values covering `min`–`max` (about `count` of them), and their step's fraction digits. */
export function niceTicks(
  min: number,
  max: number,
  count: number,
): { ticks: number[]; digits: number } {
  const span = max - min;
  if (!(span > 0) || count < 1) {
    return { ticks: [min], digits: 0 };
  }
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((factor) => factor * magnitude >= raw) ?? 10) * magnitude;
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step - 1e-9) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Number(value.toFixed(digits)));
  }
  return { ticks, digits };
}

const PAD = { top: 22, right: 8, bottom: 22, left: 44 };

interface PlotProps {
  bids: ResolvedLevel[];
  asks: ResolvedLevel[];
  mid: string | undefined;
  width: number;
  height: number;
  priceFormat: PriceFormat;
  priceDigits: number;
}

/** The SVG plot. Prices become numbers here only for geometry and tick labels. */
function DepthPlot({ bids, asks, mid, width, height, priceFormat, priceDigits }: PlotProps) {
  const messages = useFinanceMessages();
  const { locale } = useLocale();
  const prices = [...bids, ...asks].map((level) => Number(level.price));
  let low = Math.min(...prices);
  let high = Math.max(...prices);
  if (low === high) {
    const nudge = Math.abs(low) * 0.01 || 1;
    low -= nudge;
    high += nudge;
  }
  const totals = [bids.at(-1)?.total, asks.at(-1)?.total].map((total) => Number(total ?? 0));
  // Headroom above the deepest side, so its last step doesn't touch the top.
  const top = (Math.max(...totals, 0) || 1) * 1.1;
  const yTicks = niceTicks(0, top, 3);
  const plotWidth = Math.max(1, width - PAD.left - PAD.right);
  const plotHeight = Math.max(1, height - PAD.top - PAD.bottom);
  const x = (price: number) => PAD.left + ((price - low) / (high - low)) * plotWidth;
  const y = (size: number) => PAD.top + plotHeight - (size / top) * plotHeight;
  const xTicks = niceTicks(low, high, width < 420 ? 3 : 5);
  const compact = numberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const tickPrice = (value: number) =>
    formatPrice(value.toFixed(xTicks.digits), locale, {
      format: priceFormat,
      digits: xTicks.digits,
    });

  // A step line through each level's cumulative size, from the best price outward, and the area under it.
  const steps = (levels: ResolvedLevel[]) => {
    const first = levels[0];
    if (first === undefined) {
      return null;
    }
    const line = levels
      .map((level, index) => {
        const px = String(x(Number(level.price)));
        const py = String(y(Number(level.total)));
        return index === 0 ? `M${px},${String(y(0))}V${py}` : `H${px}V${py}`;
      })
      .join('');
    return { line, area: `${line}V${String(y(0))}H${String(x(Number(first.price)))}Z` };
  };
  const bidPath = steps(bids);
  const askPath = steps(asks);
  const midX = mid === undefined ? null : x(Number(mid));
  const textClasses = 'fill-fg-muted text-[11px]';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      className="block"
    >
      {yTicks.ticks.map((tick) => (
        <g key={`y${String(tick)}`}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            className={tick === 0 ? 'stroke-border-strong' : 'stroke-border'}
          />
          <text x={PAD.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className={textClasses}>
            {compact.format(tick)}
          </text>
        </g>
      ))}
      {xTicks.ticks.map((tick) => (
        <text
          key={`x${String(tick)}`}
          x={x(tick)}
          y={height - 6}
          textAnchor="middle"
          className={textClasses}
        >
          {tickPrice(tick)}
        </text>
      ))}
      {bidPath && (
        <g data-side="bid">
          <path d={bidPath.area} className="fill-success-solid/20" />
          <path d={bidPath.line} className="fill-none stroke-success-solid" strokeWidth={2} />
          <text x={PAD.left} y={PAD.top - 8} className="fill-success-fg text-xs font-medium">
            {messages.depthChartBids}
          </text>
        </g>
      )}
      {askPath && (
        <g data-side="ask">
          <path d={askPath.area} className="fill-danger-solid/20" />
          <path d={askPath.line} className="fill-none stroke-danger-solid" strokeWidth={2} />
          <text
            x={width - PAD.right}
            y={PAD.top - 8}
            textAnchor="end"
            className="fill-danger-fg text-xs font-medium"
          >
            {messages.depthChartAsks}
          </text>
        </g>
      )}
      {midX !== null && mid !== undefined && midX >= PAD.left && midX <= width - PAD.right && (
        <g data-mid="">
          <line
            x1={midX}
            x2={midX}
            y1={PAD.top - 4}
            y2={PAD.top + plotHeight}
            strokeDasharray="4 3"
            className="stroke-fg-muted"
          />
          <text
            x={clamp(midX, PAD.left + 80, width - PAD.right - 80)}
            y={PAD.top - 8}
            textAnchor="middle"
            className="fill-fg text-[11px]"
          >
            {messages.depthChartMid({
              price: formatPrice(mid, locale, {
                format: priceFormat,
                digits: Math.max(priceDigits, decimalScale(mid)),
              }),
            })}
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * A depth chart: cumulative size by price, a step area per side (bids to the left of the mid price, asks to the
 * right), labelled on the plot. It has a title, a generated summary for screen readers, and "View as table".
 */
export function DepthChart({
  bids: bidLevels,
  asks: askLevels,
  midPrice,
  grouping,
  depth,
  priceFormat = 'price',
  title,
  description,
  headingLevel = 3,
  isTitleHidden = false,
  isLoading = false,
  error,
  onRetry,
  emptyState,
  hasTableToggle = true,
  height = '16rem',
  className,
  ref,
}: DepthChartProps) {
  const messages = useFinanceMessages();
  const { locale } = useLocale();
  const titleId = useId();
  const summaryId = useId();
  const [isTable, setTable] = useState(false);
  const [plotRef, size] = useElementSize();
  const Heading = `h${String(headingLevel)}` as 'h3';

  const bids = useMemo(
    () => resolveSide(bidLevels, 'bid', { grouping, depth }),
    [bidLevels, grouping, depth],
  );
  const asks = useMemo(
    () => resolveSide(askLevels, 'ask', { grouping, depth }),
    [askLevels, grouping, depth],
  );
  const mid = midPrice ?? spreadAndMid(bids[0]?.price, asks[0]?.price)?.mid;
  const priceDigits =
    grouping === undefined
      ? maxScale([...bids, ...asks].map((level) => level.price))
      : decimalScale(grouping);
  const sizeDigits = maxScale([...bids, ...asks].flatMap((level) => [level.size, level.total]));
  const price = (value: string) =>
    formatPrice(value, locale, { format: priceFormat, digits: priceDigits });
  const amount = (value: string) => formatDecimal(value, locale, sizeDigits);

  const summary = [
    bids.length > 0 &&
      messages.depthChartBidsSummary({
        count: bids.length,
        from: price(bids[0]?.price ?? ''),
        to: price(bids.at(-1)?.price ?? ''),
        total: amount(bids.at(-1)?.total ?? ''),
      }),
    asks.length > 0 &&
      messages.depthChartAsksSummary({
        count: asks.length,
        from: price(asks[0]?.price ?? ''),
        to: price(asks.at(-1)?.price ?? ''),
        total: amount(asks.at(-1)?.total ?? ''),
      }),
    mid !== undefined &&
      `${messages.depthChartMid({
        price: formatPrice(mid, locale, {
          format: priceFormat,
          digits: Math.max(priceDigits, decimalScale(mid)),
        }),
      })}.`,
  ]
    .filter((part): part is string => typeof part === 'string')
    .join(' ');

  const hasError = error !== undefined && error !== null && error !== false;
  const isEmpty = bids.length === 0 && asks.length === 0;
  const showData = !isLoading && !hasError && !isEmpty;
  // The plot's height comes from the `height` prop (dynamic geometry).
  const heightStyle = { '--depth-height': height } as CSSProperties;

  let body: ReactNode;
  if (hasError) {
    body = <ErrorState title={messages.loadFailed} description={error} onRetry={onRetry} />;
  } else if (isLoading) {
    body = <Skeleton shape="rect" className="w-full flex-1" />;
  } else if (isEmpty) {
    body = emptyState ?? <EmptyState title={messages.noData} />;
  }

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className={cn('flex min-w-0 flex-col gap-0.5', isTitleHidden && 'sr-only')}>
          <Heading id={titleId} className="text-base font-semibold text-fg">
            {title}
          </Heading>
          {description !== undefined && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {showData && hasTableToggle && (
          <Button
            variant="ghost"
            size="sm"
            icon={Table2}
            aria-pressed={isTable}
            onPress={() => {
              setTable(!isTable);
            }}
            className="ms-auto"
          >
            {messages.depthChartViewAsTable}
          </Button>
        )}
      </div>
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
      {body !== undefined && (
        <div
          className="flex w-full min-w-0 flex-col justify-center max-sm:aspect-[4/3] sm:min-h-(--depth-height)"
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the plot's height.
          style={heightStyle}
        >
          {body}
        </div>
      )}
      {showData && isTable && (
        <ScrollRegion aria-label={title} maxHeight={height} className="p-0">
          <table className="w-full border-collapse text-sm tabular-nums">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-border text-xs text-fg-muted">
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {messages.depthChartSide}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {messages.orderBookPrice({})}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {messages.orderBookSize}
                </th>
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  {messages.depthChartCumulative}
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ...bids.map((level) => ['bid', level] as const),
                  ...asks.map((level) => ['ask', level] as const),
                ] as const
              ).map(([side, level]) => (
                <tr key={`${side}:${level.price}`} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-1.5 text-start font-medium text-fg">
                    {side === 'bid' ? messages.depthChartBid : messages.depthChartAsk}
                  </th>
                  <td className="px-3 py-1.5 text-end text-fg">{price(level.price)}</td>
                  <td className="px-3 py-1.5 text-end text-fg">{amount(level.size)}</td>
                  <td className="px-3 py-1.5 text-end text-fg">{amount(level.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}
      {showData && !isTable && (
        <div
          ref={plotRef}
          role="img"
          aria-labelledby={titleId}
          aria-describedby={summaryId}
          className="relative w-full min-w-0 overflow-hidden max-sm:aspect-[4/3] sm:h-(--depth-height)"
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the plot's height.
          style={heightStyle}
        >
          {size !== undefined && size.width > 0 && size.height > 0 && (
            <div aria-hidden="true" className="absolute inset-0">
              <DepthPlot
                bids={bids}
                asks={asks}
                mid={mid}
                width={size.width}
                height={size.height}
                priceFormat={priceFormat}
                priceDigits={priceDigits}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
