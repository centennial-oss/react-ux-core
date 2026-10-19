// Public API for @centennial-oss/react-ux-core/dashboard/chart: widget types for /chart's components. Importing it
// loads Chart.js; the dashboard core never does (ARCH-04).

export {
  timeSeriesChartWidget,
  type SeriesDisplayOverride,
  type TimeSeriesWidgetOptions,
} from './timeSeriesWidget';
export { categoryChartWidget, type CategoryChartWidgetOptions } from './categoryChartWidget';
export { gaugeWidget, type GaugeWidgetOptions } from './gaugeWidget';
