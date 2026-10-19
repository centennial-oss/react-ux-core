// Deterministic data for the scatter, radar, funnel, box plot, Sankey and bullet chart stories and tests (no
// randomness, so snapshots stay stable): fictional observatory sites, instruments, an observing proposal pipeline,
// nightly seeing and the site's energy flows.

import type { BoxPlotSeries } from '../src/chart/BoxPlotChart';
import type { CategorySeries } from '../src/chart/CategoryChart';
import type { FunnelStep } from '../src/chart/Funnel';
import type { SankeyLink, SankeyNode } from '../src/chart/SankeyChart';
import type { ScatterSeries } from '../src/chart/ScatterChart';

/** Candidate telescope sites: altitude (m) against clear nights a year, sized by the mirror they could host (m). */
export const sites: readonly ScatterSeries[] = [
  {
    id: 'north',
    label: 'Northern sites',
    data: [
      { label: 'Cerro Alto', x: 2_400, y: 262, size: 4.1 },
      { label: 'Pico Brumoso', x: 1_850, y: 214, size: 2.5 },
      { label: 'Mesa Larga', x: 2_950, y: 281, size: 6.5 },
      { label: 'Loma Fría', x: 1_200, y: 168, size: 1.2 },
      { label: 'Sierra Clara', x: 3_300, y: 296, size: 8.2 },
      { label: 'Monte Viento', x: 2_100, y: 233, size: 3.6 },
    ],
  },
  {
    id: 'south',
    label: 'Southern sites',
    data: [
      { label: 'Altiplano Sur', x: 4_100, y: 318, size: 10.4 },
      { label: 'Cumbre Seca', x: 3_650, y: 305, size: 8.8 },
      { label: 'Valle Hondo', x: 950, y: 141, size: 1 },
      { label: 'Cerro Pardo', x: 2_700, y: 251, size: 4.6 },
      { label: 'Llano Azul', x: 3_050, y: 289, size: 6.1 },
    ],
  },
];

/** The same sites without sizes: a plain scatter chart. */
export const sitesScatter: readonly ScatterSeries[] = sites.map((entry) => ({
  ...entry,
  data: entry.data.map(({ size: _size, ...point }) => point),
}));

/** Two instruments scored from 0 to 5. */
export const instrumentAxes: readonly string[] = [
  'Resolution',
  'Sensitivity',
  'Field of view',
  'Cadence',
  'Uptime',
  'Cost',
];
export const instrumentScores: readonly CategorySeries[] = [
  { id: 'echelle', label: 'Echelle spectrograph', data: [4.6, 3.8, 1.4, 2.2, 4.1, 2.0] },
  { id: 'wide', label: 'Wide-field imager', data: [2.4, 4.2, 4.8, 4.0, 3.6, 3.4] },
];

/** This year's observing proposals, from submission to observation. */
export const proposalFunnel: readonly FunnelStep[] = [
  { label: 'Submitted', value: 1_240 },
  { label: 'Technically feasible', value: 980 },
  { label: 'Reviewed', value: 760 },
  { label: 'Shortlisted', value: 310 },
  { label: 'Scheduled', value: 182 },
  { label: 'Observed', value: 164 },
];

/** Thirty nights of seeing (arcseconds) at a site, from a fixed pattern around `centre`, with one or two bad nights. */
function seeing(centre: number, spread: number, bad: readonly number[]): number[] {
  return [
    ...Array.from(
      { length: 30 },
      (_, night) =>
        Math.round((centre + spread * Math.sin(night * 1.7) * Math.cos(night * 0.6)) * 100) / 100,
    ),
    ...bad,
  ];
}

export const seeingSites: readonly string[] = [
  'Cerro Alto',
  'Mesa Larga',
  'Sierra Clara',
  'Altiplano Sur',
];
export const seeingSeries: readonly BoxPlotSeries[] = [
  {
    id: 'summer',
    label: 'Summer',
    data: [
      seeing(0.92, 0.22, [1.9]),
      seeing(0.78, 0.18, []),
      seeing(0.71, 0.15, [1.6, 1.75]),
      seeing(0.64, 0.12, [1.4]),
    ],
  },
  {
    id: 'winter',
    label: 'Winter',
    data: [
      seeing(1.08, 0.28, []),
      seeing(0.9, 0.2, [2.1]),
      seeing(0.83, 0.17, []),
      seeing(0.75, 0.14, [1.65]),
    ],
  },
];

/** The site's energy for a year (MWh): from its sources, through the switchboard, to its uses. */
export const energyNodes: readonly SankeyNode[] = [
  { id: 'solar', label: 'Solar' },
  { id: 'grid', label: 'Grid' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'board', label: 'Switchboard', color: 'neutral' },
  { id: 'telescopes', label: 'Telescopes' },
  { id: 'domes', label: 'Dome climate' },
  { id: 'data', label: 'Data centre' },
  { id: 'workshops', label: 'Workshops' },
  { id: 'lodging', label: 'Lodging' },
];
export const energyLinks: readonly SankeyLink[] = [
  { source: 'solar', target: 'board', value: 420 },
  { source: 'grid', target: 'board', value: 610 },
  { source: 'diesel', target: 'board', value: 70 },
  { source: 'board', target: 'telescopes', value: 340 },
  { source: 'board', target: 'domes', value: 220 },
  { source: 'board', target: 'data', value: 380 },
  { source: 'board', target: 'workshops', value: 90 },
  { source: 'board', target: 'lodging', value: 70 },
];
