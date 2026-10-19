// The gauge widget (§10.6): /chart's Gauge fed `gauge` data, an arc or a bar against the value's range and
// thresholds, zoomed with the dashboard on large displays.

import { Gauge as GaugeIcon } from 'lucide-react';
import { Gauge, type GaugeProps } from '../../chart/Gauge';
import { gaugeShape, type GaugeData } from '../data/shapes';
import type { JsonObject } from '../types';
import { widgetFromComponent } from '../widgets/define';
import { ScaledContent } from '../widgets/ScaledContent';

/** The gauge widget's options. */
export interface GaugeWidgetOptions extends JsonObject {
  variant: 'arc' | 'bar';
  minValue: number;
  /** The most fraction digits the value shows. */
  fractionDigits: number;
  badWhen: 'high' | 'low';
  hasStatus: boolean;
}

/** What the widget's component gets. */
export interface GaugeWidgetViewProps {
  gauge: GaugeProps;
  scale: number;
}

function GaugeWidgetView({ gauge, scale }: GaugeWidgetViewProps) {
  return (
    <ScaledContent scale={scale} className="items-center justify-center overflow-hidden px-3 pb-2">
      <Gauge
        {...gauge}
        // The frame shows the title; the gauge keeps it as its accessible name only (one title, WID-07).
        className="w-full [&>:first-child]:sr-only"
      />
    </ScaledContent>
  );
}

/** The gauge widget type (P1). */
export const gaugeWidget = widgetFromComponent<GaugeWidgetOptions, GaugeData, GaugeWidgetViewProps>(
  {
    type: 'ccux.gauge',
    displayName: (messages) => messages.gaugeWidget,
    description: (messages) => messages.gaugeWidgetDescription,
    icon: GaugeIcon,
    category: (messages) => messages.widgetCategoryFigures,
    dataShape: gaugeShape,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    minPixelSize: { width: 160, height: 120 },
    stackedHeight: 4,
    defaultOptions: {
      variant: 'arc',
      minValue: 0,
      fractionDigits: 1,
      badWhen: 'high',
      hasStatus: true,
    },
    optionsSchema: [
      {
        type: 'pillbox',
        name: 'variant',
        label: (m) => m.optionGaugeVariant,
        items: [
          { id: 'arc', label: (m) => m.gaugeArc },
          { id: 'bar', label: (m) => m.gaugeBar },
        ],
      },
      { type: 'number', name: 'minValue', label: (m) => m.optionMinValue },
      {
        type: 'number',
        name: 'fractionDigits',
        label: (m) => m.optionFractionDigits,
        minValue: 0,
        maxValue: 6,
      },
      {
        type: 'pillbox',
        name: 'badWhen',
        label: (m) => m.optionBadWhen,
        items: [
          { id: 'high', label: (m) => m.badWhenHigh },
          { id: 'low', label: (m) => m.badWhenLow },
        ],
      },
      { type: 'switch', name: 'hasStatus', label: (m) => m.optionShowStatus },
    ],
    toProps: (data, options, env) => {
      const gauge: GaugeProps = {
        label: env.title,
        value: data?.value ?? options.minValue,
        minValue: options.minValue,
        maxValue: data?.maxValue ?? options.minValue + 1,
        variant: options.variant,
        badWhen: options.badWhen,
        hasStatus: options.hasStatus,
        formatOptions: { maximumFractionDigits: Math.max(0, Math.round(options.fractionDigits)) },
      };
      if (data?.thresholds) {
        gauge.thresholds = data.thresholds;
      }
      if (data?.unit !== undefined) {
        gauge.unit = data.unit;
      }
      return { gauge, scale: env.frameSize.scale };
    },
    component: GaugeWidgetView,
  },
);
