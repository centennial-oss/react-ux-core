// The consolidated legend widget (§10.5): one legend for every chart on the page. Each entry is a toggle that shows or
// hides matching series page-wide (BI-10), and hovering or focusing it highlights them and their frames (CTX-12).

import { List } from 'lucide-react';
import { useMemo, type CSSProperties } from 'react';
import { useLocale } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { cn } from '../../utils/cn';
import type { DashboardLegendEntry, WidgetRenderProps } from '../types';
import { defineWidget } from './define';
import { scaleStyle } from './scale';

/** The legend widget's options. */
export interface LegendWidgetOptions {
  [key: string]: string;
  /** Entries sorted by name in the active locale (the default), or in the order they first appear (BI-09). */
  order: 'label' | 'firstSeen';
}

const DASHES: Record<NonNullable<DashboardLegendEntry['lineStyle']>, string | undefined> = {
  solid: undefined,
  dashed: '4 3',
  dotted: '1.5 2.5',
  dashDot: '5 2 1.5 2',
};

/** A swatch in the shape the series is drawn: a line (with its dash), a block (bars and areas) or a dot. */
function Swatch({ entry }: { entry: DashboardLegendEntry }) {
  // The series' colour, resolved from the theme by the chart that publishes it.
  const style = { color: entry.color } as CSSProperties;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 12"
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={style}
      className="h-[0.75em] w-[1em] shrink-0 overflow-visible"
    >
      {entry.kind === 'line' && (
        <line
          x1="1"
          y1="6"
          x2="15"
          y2="6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={DASHES[entry.lineStyle ?? 'solid']}
        />
      )}
      {(entry.kind === 'bar' || entry.kind === 'area') && (
        <rect
          x="2"
          y="1"
          width="12"
          height="10"
          rx="2"
          fill="currentColor"
          opacity={entry.kind === 'area' ? 0.6 : 1}
        />
      )}
      {entry.kind === 'point' && <circle cx="8" cy="6" r="4" fill="currentColor" />}
    </svg>
  );
}

/** The legend: every published entry, de-duplicated, flowing into columns and scrolling inside when it must. */
function LegendView({
  displayOptions,
  dashboard,
  frameSize,
  messages,
}: WidgetRenderProps<LegendWidgetOptions, null>) {
  const { locale } = useLocale();
  const { legendEntries, hiddenLegendKeys, toggleLegendKey, setHighlightedLegendKey } = dashboard;
  const entries = useMemo(() => {
    if (displayOptions.order === 'firstSeen') {
      return legendEntries;
    }
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
    return [...legendEntries].sort((a, b) => collator.compare(a.label, b.label));
  }, [legendEntries, displayOptions.order, locale]);

  if (entries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        <EmptyState icon={List} title={messages.legendEmpty} headingLevel={4} className="py-4" />
      </div>
    );
  }
  // Large displays scale the legend as a whole (RESP-08); its text grows with its frame between a minimum and a
  // maximum size (BI-11).
  const zoom = scaleStyle(frameSize.scale);
  return (
    <div className="@container min-h-0 flex-1 overflow-auto px-2 pb-2">
      <ul
        aria-label={messages.legendEntries}
        // eslint-disable-next-line no-restricted-syntax -- dynamic: the content scale.
        style={zoom}
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-x-2 text-[clamp(0.8125rem,4cqi,1.125rem)]"
      >
        {entries.map((entry) => {
          const isHidden = hiddenLegendKeys.has(entry.key);
          return (
            <li key={entry.key} className="min-w-0">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={!isHidden}
                onPress={() => {
                  toggleLegendKey(entry.key);
                }}
                onHoverStart={() => {
                  setHighlightedLegendKey(entry.key);
                }}
                onHoverEnd={() => {
                  setHighlightedLegendKey(null);
                }}
                onFocus={() => {
                  setHighlightedLegendKey(entry.key);
                }}
                onBlur={() => {
                  setHighlightedLegendKey(null);
                }}
                // Hidden entries are struck through and faded, not told apart by colour alone (A11Y-08).
                className={cn(
                  'w-full justify-start text-[length:inherit]',
                  isHidden && 'text-fg-muted line-through opacity-70',
                )}
              >
                <Swatch entry={entry} />
                <span className="min-w-0 truncate">{entry.label}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The consolidated legend widget type (P0). */
export const legendWidget = defineWidget<LegendWidgetOptions, null>({
  type: 'ccux.legend',
  displayName: (messages) => messages.legendWidget,
  description: (messages) => messages.legendWidgetDescription,
  icon: List,
  category: (messages) => messages.widgetCategoryLayout,
  dataShape: null,
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  stackedHeight: 'content',
  defaultOptions: { order: 'label' },
  optionsSchema: [
    {
      type: 'pillbox',
      name: 'order',
      label: (messages) => messages.optionLegendOrder,
      items: [
        { id: 'label', label: (messages) => messages.optionOrderLabel },
        { id: 'firstSeen', label: (messages) => messages.optionOrderFirstSeen },
      ],
    },
  ],
  capabilities: { isLegend: true },
  component: LegendView,
});
