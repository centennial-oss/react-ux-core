import type { Meta, StoryObj } from '@storybook/react-vite';
import { CategoryChart } from './CategoryChart';
import { Gauge, MeterBar } from './Gauge';
import { HourOfDayChart } from './HourOfDayChart';
import { TimeSeriesChart, type TimeSeries } from './TimeSeriesChart';

const meta = {
  title: 'Chart/Charts',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const START = Date.UTC(2026, 9, 12, 6);
const HOUR = 3_600_000;

/** Deterministic daily-cycle data (no randomness, so snapshots stay stable). */
function hourly(hours: number, shape: (hour: number) => number) {
  return Array.from({ length: hours }, (_, index) => ({
    t: START + index * HOUR,
    v: Math.round(shape(index) * 10) / 10,
  }));
}

const usage: TimeSeries = {
  id: 'usage',
  label: 'Usage',
  unit: 'kW',
  type: 'area',
  color: 'chart-1',
  data: hourly(72, (hour) => 40 + 25 * Math.sin(((hour % 24) - 6) * (Math.PI / 12)) + (hour % 5)),
  // The last 12 hours are a forecast.
  segments: [{ from: START + 60 * HOUR, to: START + 72 * HOUR, style: 'dashed' }],
};

const temperature: TimeSeries = {
  id: 'temperature',
  label: 'Temperature',
  unit: '°C',
  axis: 'right',
  color: 'chart-2',
  dash: [4, 3],
  data: hourly(72, (hour) => 12 + 8 * Math.sin(((hour % 24) - 9) * (Math.PI / 12))),
};

const solar: TimeSeries = {
  id: 'solar',
  label: 'Solar',
  unit: 'kW',
  type: 'bar',
  color: 'chart-3',
  data: hourly(72, (hour) => Math.max(0, 30 * Math.sin(((hour % 24) - 1) * (Math.PI / 12)))),
};

/**
 * Usage (area, with a dashed forecast), solar (bars) and temperature (on a right axis), in Denver time, with a
 * contract limit and a normal band. Hover or tap for every series at that time; click the legend to hide or
 * highlight; drag across the chart to select a range (pinch and pan on touch).
 */
export const TimeSeriesOverview: Story = {
  render: () => (
    <TimeSeriesChart
      title="North substation load"
      description="Last 3 days, hourly, Denver time"
      series={[usage, solar, temperature]}
      timeZone="America/Denver"
      thresholds={[{ value: 70, label: 'Contract limit', tone: 'danger' }]}
      bands={[{ from: 20, to: 55, tone: 'success' }]}
      onRangeSelect={() => undefined}
      exportFileName="north-substation-load"
    />
  ),
};

/** Loading, empty and error states. */
export const TimeSeriesStates: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <TimeSeriesChart title="Loading" series={[]} isLoading height="10rem" />
      <TimeSeriesChart title="No readings" series={[{ ...usage, data: [] }]} height="10rem" />
      <TimeSeriesChart
        title="Failed"
        series={[]}
        error="The meter service didn’t respond."
        onRetry={() => undefined}
        height="10rem"
      />
    </div>
  ),
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/** Grouped bars by month, with export. */
export const Bars: Story = {
  render: () => (
    <CategoryChart
      title="Energy by month"
      type="bar"
      unit="MWh"
      categories={months}
      series={[
        { id: 'grid', label: 'Grid', data: [42, 38, 35, 30, 28, 33] },
        { id: 'solar', label: 'Solar', data: [8, 12, 18, 24, 29, 31] },
      ]}
      exportFileName="energy-by-month"
    />
  ),
};

/** Stacked bars. */
export const StackedBars: Story = {
  render: () => (
    <CategoryChart
      title="Energy mix"
      type="stackedBar"
      unit="MWh"
      categories={months}
      series={[
        { id: 'grid', label: 'Grid', data: [42, 38, 35, 30, 28, 33] },
        { id: 'solar', label: 'Solar', data: [8, 12, 18, 24, 29, 31] },
        { id: 'battery', label: 'Battery', data: [2, 3, 3, 5, 6, 6] },
      ]}
    />
  ),
};

/** Horizontal bars suit long category names. */
export const HorizontalBars: Story = {
  render: () => (
    <CategoryChart
      title="Usage by site"
      type="horizontalBar"
      unit="kWh"
      categories={['North substation', 'South depot', 'East campus', 'West warehouse']}
      series={[{ id: 'usage', label: 'Usage', data: [1840, 920, 1310, 560] }]}
    />
  ),
};

/** A donut of shares, with categories in the legend. */
export const Donut: Story = {
  render: () => (
    <CategoryChart
      title="Tariff mix"
      type="donut"
      unit="sites"
      categories={['Flat', 'Time of use', 'Demand', 'EV']}
      series={[{ id: 'sites', label: 'Sites', data: [120, 64, 31, 18] }]}
    />
  ),
};

const weekdayProfile = [
  12, 11, 10, 10, 11, 14, 22, 35, 48, 52, 55, 57, 56, 55, 54, 53, 50, 46, 40, 32, 25, 19, 15, 13,
];

/** An hourly profile next to a schedule (a ScheduleEditor value, shown as each hour's average). */
export const HourOfDay: Story = {
  render: () => (
    <HourOfDayChart
      title="Typical weekday"
      description="Average load by hour, against the demand limit schedule"
      unit="kW"
      series={[
        { id: 'load', label: 'Average load', data: weekdayProfile },
        {
          id: 'limit',
          label: 'Demand limit',
          color: 'chart-4',
          schedule: [
            { start: '00:00', end: '06:00', value: 40 },
            { start: '06:00', end: '18:30', value: 60 },
            { start: '18:30', end: '24:00', value: 45 },
          ],
        },
      ]}
    />
  ),
};

/** Gauges as arcs and bars, in each state. Status shows as a shaped dot and a word, not only colour. */
export const Gauges: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <Gauge
        label="Demand"
        value={142}
        maxValue={250}
        unit="kW"
        thresholds={{ warning: 180, danger: 220 }}
      />
      <Gauge
        label="Transformer load"
        value={0.86}
        maxValue={1}
        formatOptions={{ style: 'percent' }}
        thresholds={{ warning: 0.75, danger: 0.9 }}
      />
      <Gauge
        label="Battery"
        value={12}
        maxValue={100}
        unit="%"
        badWhen="low"
        thresholds={{ warning: 30, danger: 15 }}
      />
      <MeterBar
        label="Monthly budget"
        value={8200}
        maxValue={10000}
        formatOptions={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
        thresholds={{ warning: 8000, danger: 9500 }}
      />
      <MeterBar
        label="Storage"
        value={410}
        maxValue={500}
        unit="GB"
        thresholds={{ warning: 400, danger: 475 }}
      />
      <MeterBar
        label="Uptime"
        value={99.2}
        minValue={95}
        maxValue={100}
        unit="%"
        badWhen="low"
        thresholds={{ warning: 99, danger: 98 }}
      />
    </div>
  ),
};

const DAY = 24 * HOUR;
const practice: TimeSeries = {
  id: 'practice',
  label: 'Quiz score',
  unit: '%',
  data: [48, 51, 55, 53, 58, 62].map((v, index) => ({ t: START + index * DAY, v })),
};
const studyHours: TimeSeries = {
  id: 'hours',
  label: 'Study hours',
  unit: 'h',
  type: 'bar',
  axis: 'right',
  color: 'chart-3',
  data: [1.5, 2, 0.5, 3, 2.5, 1].map((v, index) => ({ t: START + index * DAY, v })),
};
const gate = { value: 80, label: 'A grade', tone: 'success' as const };

/**
 * Value axes. A threshold above the data stretches its axis so it shows (the default); `shouldIncludeReferences:
 * false` fits the data only; `min`/`max` pin a percent axis to 0–100; and dual axes take their own ranges.
 */
export const ValueAxisRanges: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <TimeSeriesChart
        title="Threshold above the data"
        series={[practice]}
        thresholds={[gate]}
        timeZone="UTC"
        height="14rem"
      />
      <TimeSeriesChart
        title="References left out"
        series={[practice]}
        thresholds={[gate]}
        axes={{ left: { shouldIncludeReferences: false } }}
        timeZone="UTC"
        height="14rem"
      />
      <TimeSeriesChart
        title="Pinned to 0–100"
        series={[practice]}
        thresholds={[gate]}
        axes={{ left: { min: 0, max: 100, title: 'Score' } }}
        timeZone="UTC"
        height="14rem"
      />
      <TimeSeriesChart
        title="Two axes, two ranges"
        series={[practice, studyHours]}
        axes={{
          left: { min: 0, max: 100, title: 'Score' },
          right: { min: 0, max: 4, title: 'Hours' },
        }}
        timeZone="UTC"
        height="14rem"
      />
      <CategoryChart
        title="Score by topic"
        type="horizontalBar"
        categories={['Mechanics', 'Waves and sound', 'Light and optics', 'Astronomy']}
        series={[{ id: 'score', label: 'Score', data: [71, 58, 64, 49] }]}
        unit="%"
        valueAxis={{ min: 0, max: 100 }}
        height="14rem"
      />
    </div>
  ),
};

/**
 * A gauge's status in the app's own words (`statusLabels`), left out (`hasStatus={false}`), or replaced outright
 * (`status`), here a neutral "Not started" for a lab with no checks run.
 */
export const GaugeStatuses: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <MeterBar
        label="Course progress"
        value={64}
        maxValue={100}
        unit="%"
        badWhen="low"
        thresholds={{ warning: 70, danger: 50 }}
        statusLabels={{ normal: 'On track', warning: 'Behind', danger: 'At risk' }}
      />
      <MeterBar label="Labs completed" value={4} maxValue={6} hasStatus={false} />
      <MeterBar
        label="Lab reports"
        value={0}
        maxValue={6}
        badWhen="low"
        thresholds={{ danger: 2 }}
        status={{ tone: 'neutral', label: 'Not started' }}
      />
    </div>
  ),
};

/** Area shades that fade toward the x-axis: `fade` 0 (no fade), 50, and 100 (transparent at the axis). */
export const FadedAreas: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {[
        { fade: 0, shadeOpacity: 0.2, color: 'chart-1' as const },
        { fade: 50, shadeOpacity: 0.35, color: 'chart-3' as const },
        { fade: 100, shadeOpacity: 0.5, color: 'chart-2' as const },
      ].map(({ fade, shadeOpacity, color }) => (
        <TimeSeriesChart
          key={fade}
          title={`Fade ${String(fade)}, shade opacity ${String(shadeOpacity)}`}
          height="10rem"
          series={[{ ...usage, segments: undefined, color, fade, shadeOpacity }]}
          timeZone="America/Denver"
        />
      ))}
    </div>
  ),
};
