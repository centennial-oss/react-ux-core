// The stat group widget (§10.2): a titled group of StatTiles that flows to fit its frame, formats numbers in the
// active locale, and rotates tiles that have several variants of the same figure (BI-04).

import { Gauge } from 'lucide-react';
import { memo, useState, type CSSProperties } from 'react';
import { useLocale } from 'react-aria-components';
import { formatRelativeTime, RelativeTime } from '../../components/RelativeTime/RelativeTime';
import { StatTile } from '../../components/StatTile/StatTile';
import { cn } from '../../utils/cn';
import { listFormat, numberFormat } from '../../utils/intl';
import { useNow } from '../../utils/timers';
import { useIsReducedMotion } from '../../utils/useMediaQuery';
import { useIsPageHidden } from '../../utils/usePageVisibility';
import { useRecurringTimer } from '../../utils/useRecurringTimer';
import { statsShape, type StatItem, type StatsData, type StatTileData } from '../data/shapes';
import type { DashboardStrings } from '../messages';
import type { DashboardMode, JsonObject, WidgetSize } from '../types';
import { scaleStyle } from './scale';
import { widgetFromComponent } from './define';

/** The stat group's options. */
export interface StatGroupOptions extends JsonObject {
  /** Most decimals shown for numbers. Defaults to 2. */
  fractionDigits: number;
  /** Shown for missing figures. Empty uses the `statMissingValue` message ("—"). */
  placeholder: string;
  /** Draws each figure's trend behind it. Defaults to true. */
  hasSparklines: boolean;
  /** How long each variant of a rotating tile shows. Defaults to 15 seconds. */
  rotationIntervalMs: number;
  /** Tiles per row: `auto` fits as many as their minimum width allows (BI-03). */
  tileColumns: number | 'auto';
}

export interface StatGroupProps {
  items: readonly StatItem[];
  options: StatGroupOptions;
  mode: DashboardMode;
  size: WidgetSize;
  messages: DashboardStrings;
}

interface TileProps {
  item: StatItem;
  options: StatGroupOptions;
  isCompact: boolean;
  isPaused: boolean;
  format: (value: number | string | null) => string;
  messages: DashboardStrings;
  locale: string;
}

/** A tile's footer: which variant it shows and where the figure comes from, with its time (BI-05). */
function TileFooter({
  data,
  position,
  messages,
  locale,
  isStatic,
}: {
  data: StatTileData;
  position?: string;
  messages: DashboardStrings;
  locale: string;
  isStatic: boolean;
}) {
  const now = useNow();
  const parts = [
    position,
    data.caption,
    data.sources && data.sources.length > 0
      ? messages.statSources({ sources: listFormat(locale, { type: 'unit' }).format(data.sources) })
      : undefined,
  ].filter((part): part is string => part !== undefined && part !== '');
  const time = data.timestamp === undefined ? undefined : new Date(data.timestamp);
  if (parts.length === 0 && time === undefined) {
    return undefined;
  }
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {parts.map((part) => (
        <span key={part}>{part}</span>
      ))}
      {time !== undefined &&
        // A pressable tile can't hold RelativeTime's own button, so it shows the text.
        (isStatic ? (
          <RelativeTime value={time} />
        ) : (
          <span>{formatRelativeTime(time, now, locale)}</span>
        ))}
    </span>
  );
}

/** One tile. With variants it's a button that advances, and rotates while nobody is looking at it (BI-04). */
function Tile({ item, options, isCompact, isPaused, format, messages, locale }: TileProps) {
  const variants = item.variants ?? [];
  const isRotating = variants.length > 1;
  const [index, setIndex] = useState(0);
  const [isHovered, setHovered] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const isPageHidden = useIsPageHidden();
  const isReducedMotion = useIsReducedMotion();
  const position = variants.length === 0 ? 0 : index % variants.length;
  const advance = () => {
    setIndex((current) => (current + 1) % Math.max(1, variants.length));
  };
  const { restart } = useRecurringTimer(
    advance,
    isRotating ? options.rotationIntervalMs : undefined,
    {
      isRunning: !isPaused && !isHovered && !isFocused && !isPageHidden && !isReducedMotion,
    },
  );
  const data: StatTileData = isRotating
    ? { ...item, ...variants[position], label: item.label }
    : item;
  const value = format(data.value);
  const positionText = isRotating
    ? messages.statVariantPosition({ position: position + 1, total: variants.length })
    : undefined;
  return (
    <StatTile
      label={data.label}
      value={value}
      unit={data.unit}
      delta={data.delta}
      sparkline={options.hasSparklines && !isCompact ? data.sparkline : undefined}
      footer={
        <TileFooter
          data={data}
          position={positionText}
          messages={messages}
          locale={locale}
          isStatic={!isRotating}
        />
      }
      // A tile with variants is a button that advances them (BI-04), named by what it shows, then what it does.
      onPress={
        isRotating
          ? () => {
              advance();
              restart();
            }
          : undefined
      }
      pressHint={isRotating ? messages.statShowNext : undefined}
      onHoverChange={setHovered}
      onFocusChange={setFocused}
      className="h-full"
    />
  );
}

/** The figures in tiles, flowing into as many columns as fit. */
export const StatGroup = memo(function StatGroup({
  items,
  options,
  mode,
  size,
  messages,
}: StatGroupProps) {
  const { locale } = useLocale();
  const formatter = numberFormat(locale, {
    maximumFractionDigits: Math.max(0, Math.min(20, Math.round(options.fractionDigits))),
  });
  const placeholder = options.placeholder === '' ? messages.statMissingValue : options.placeholder;
  const format = (value: number | string | null) =>
    value === null || (typeof value === 'number' && !Number.isFinite(value))
      ? placeholder
      : typeof value === 'number'
        ? formatter.format(value)
        : value;
  const columns =
    options.tileColumns === 'auto' ? undefined : Math.max(1, Math.round(options.tileColumns));
  // Large displays scale the tiles as a whole: type, strokes and spacing (RESP-08). Zoom keeps text and SVG crisp.
  const style: CSSProperties = {
    gridTemplateColumns:
      columns === undefined ? undefined : `repeat(${String(columns)}, minmax(0, 1fr))`,
    ...scaleStyle(size.scale),
  };
  return (
    <div className="min-h-0 flex-1 overflow-auto p-2">
      <ul
        // Dynamic: a fixed tile column count, and the content scale.
        // eslint-disable-next-line no-restricted-syntax -- see above.
        style={style}
        className={cn(
          'grid gap-2',
          columns === undefined && 'grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))]',
        )}
      >
        {items.map((item, index) => (
          <li key={item.id ?? `${item.label}-${String(index)}`} className="min-w-0">
            <Tile
              item={item}
              options={options}
              isCompact={size.sizeClass === 'compact'}
              isPaused={mode === 'edit'}
              format={format}
              messages={messages}
              locale={locale}
            />
          </li>
        ))}
      </ul>
    </div>
  );
});

/** The stat group widget type (P0): `stats` data in tiles. */
export const statGroupWidget = widgetFromComponent<StatGroupOptions, StatsData, StatGroupProps>({
  type: 'ccux.statGroup',
  displayName: (messages) => messages.statGroupWidget,
  description: (messages) => messages.statGroupWidgetDescription,
  icon: Gauge,
  category: (messages) => messages.widgetCategoryFigures,
  dataShape: statsShape,
  defaultSize: { w: 3, h: 4 },
  minSize: { w: 2, h: 2 },
  minPixelSize: { width: 160, height: 120 },
  stackedHeight: 'content',
  defaultOptions: {
    fractionDigits: 2,
    placeholder: '',
    hasSparklines: true,
    rotationIntervalMs: 15_000,
    tileColumns: 'auto',
  },
  optionsSchema: [
    {
      type: 'number',
      name: 'fractionDigits',
      label: (m) => m.optionFractionDigits,
      minValue: 0,
      maxValue: 6,
      step: 1,
    },
    { type: 'text', name: 'placeholder', label: (m) => m.optionPlaceholder },
    { type: 'switch', name: 'hasSparklines', label: (m) => m.optionSparkline },
    {
      type: 'number',
      name: 'rotationIntervalMs',
      label: (m) => m.optionRotation,
      minValue: 3000,
      maxValue: 120_000,
      step: 1000,
    },
    {
      type: 'select',
      name: 'tileColumns',
      label: (m) => m.optionTileColumns,
      items: [
        { id: 'auto', label: (m) => m.optionTileColumnsAuto },
        { id: 1, label: '1' },
        { id: 2, label: '2' },
        { id: 3, label: '3' },
        { id: 4, label: '4' },
        { id: 6, label: '6' },
      ],
    },
  ],
  component: StatGroup,
  toProps: (data, options, env) => ({
    items: data?.items ?? [],
    options,
    mode: env.mode,
    size: env.frameSize,
    messages: env.messages,
  }),
});
