// Six vital signs and twelve lab values over ten time points (every 4 hours from Oct 12, 2026 00:00 UTC): the
// Flowsheet fixture shared by its stories and tests. Sample data only; the ranges are typical adult values.
import type { Observation, ObservationFlag, ObservationValue } from '../src/table/reference';

/** The ten observation times, oldest first, as epoch milliseconds. */
export const flowsheetTimes: number[] = Array.from(
  { length: 10 },
  (_, index) => Date.UTC(2026, 9, 12, 0, 0) + index * 4 * 3_600_000,
);

export const flowsheetObservations: Observation[] = [
  {
    id: 'hr',
    label: 'Heart rate',
    unit: 'bpm',
    group: 'Vitals',
    referenceRange: { low: 60, high: 100 },
    criticalRange: { low: 40, high: 140 },
  },
  {
    id: 'sbp',
    label: 'Systolic BP',
    unit: 'mmHg',
    group: 'Vitals',
    referenceRange: { low: 90, high: 140 },
    criticalRange: { low: 70, high: 180 },
  },
  {
    id: 'dbp',
    label: 'Diastolic BP',
    unit: 'mmHg',
    group: 'Vitals',
    referenceRange: { low: 60, high: 90 },
  },
  {
    id: 'rr',
    label: 'Respiratory rate',
    unit: '/min',
    group: 'Vitals',
    referenceRange: { low: 12, high: 20 },
    criticalRange: { low: 8, high: 30 },
  },
  {
    id: 'temp',
    label: 'Temperature',
    unit: '°C',
    group: 'Vitals',
    referenceRange: { low: 36.1, high: 37.8 },
    criticalRange: { low: 35, high: 40 },
    formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    id: 'spo2',
    label: 'SpO₂',
    unit: '%',
    group: 'Vitals',
    referenceRange: { low: 95 },
    criticalRange: { low: 88 },
  },
  {
    id: 'na',
    label: 'Sodium',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 135, high: 145 },
    criticalRange: { low: 120, high: 160 },
  },
  {
    id: 'k',
    label: 'Potassium',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 3.5, high: 5.1 },
    criticalRange: { low: 2.8, high: 6.2 },
    formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    id: 'cl',
    label: 'Chloride',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 98, high: 107 },
  },
  {
    id: 'hco3',
    label: 'Bicarbonate',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 22, high: 29 },
  },
  {
    id: 'urea',
    label: 'Urea',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 2.5, high: 7.8 },
    formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    id: 'creat',
    label: 'Creatinine',
    unit: 'µmol/L',
    group: 'Chemistry',
    referenceRange: { low: 60, high: 110 },
  },
  {
    id: 'glu',
    label: 'Glucose',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 3.9, high: 7.8 },
    criticalRange: { low: 2.5, high: 25 },
    formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    id: 'ca',
    label: 'Calcium',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 2.15, high: 2.55 },
    criticalRange: { low: 1.75, high: 3.25 },
    formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  {
    id: 'lact',
    label: 'Lactate',
    unit: 'mmol/L',
    group: 'Chemistry',
    referenceRange: { low: 0.5, high: 2.2 },
    criticalRange: { high: 4 },
    formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    id: 'hgb',
    label: 'Hemoglobin',
    unit: 'g/L',
    group: 'Hematology',
    referenceRange: { low: 130, high: 170 },
    criticalRange: { low: 70, high: 200 },
  },
  {
    id: 'wbc',
    label: 'White cells',
    unit: '×10⁹/L',
    group: 'Hematology',
    referenceRange: { low: 4, high: 11 },
    criticalRange: { low: 1, high: 30 },
    formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    id: 'plt',
    label: 'Platelets',
    unit: '×10⁹/L',
    group: 'Hematology',
    referenceRange: { low: 150, high: 400 },
    criticalRange: { low: 20, high: 1000 },
  },
];

type Reading =
  number | string | null | { value: number | string; flag?: ObservationFlag; note?: string };

/** Each observation's readings at the ten times, oldest first; `null` is no reading. */
const readings: Record<string, Reading[]> = {
  hr: [72, 78, 84, 92, 104, 128, 145, 118, 96, 88],
  sbp: [124, 118, 110, 98, 88, 82, 68, 92, 104, 116],
  dbp: [78, 74, 70, 64, 58, 54, 46, 60, 66, 72],
  rr: [16, 18, 18, 20, 22, 24, 28, 22, 18, 16],
  temp: [36.8, 37.2, 37.9, 38.4, 38.9, 39.2, 38.6, 37.9, 37.4, 37.0],
  spo2: [98, 97, 96, 94, 92, 90, 87, 93, 95, 97],
  na: [139, 138, 136, 134, 133, 131, 129, 132, 135, 137],
  k: [
    4.2,
    4.4,
    4.8,
    // Above the range, but the lab flags it normal: the source flag wins.
    { value: 5.3, flag: 'N', note: 'Hemolyzed sample; repeat ordered' },
    5.6,
    5.9,
    6.4,
    5.4,
    4.9,
    4.5,
  ],
  cl: [102, 101, 100, 99, 97, 96, 95, 98, 100, 101],
  hco3: [25, 24, 23, 21, 19, 17, 15, 19, 22, 24],
  urea: [5.1, 5.4, 6.0, 7.2, 8.4, 9.6, 11.2, 10.1, 8.8, 7.5],
  creat: [82, 85, 91, 104, 118, 136, 152, 141, 126, 109],
  glu: [5.6, 6.2, 7.1, 8.4, 9.2, 2.3, 10.6, 8.9, 7.4, 6.5],
  ca: [2.32, null, 2.24, 2.18, 2.12, 2.08, 2.02, 2.1, 2.16, 2.22],
  lact: [{ value: '<0.3', flag: 'L' }, null, 1.4, 2.1, 2.8, 3.6, 4.6, 3.1, 2.0, 1.2],
  hgb: [142, 140, 136, 131, 126, 118, 104, 112, 120, 125],
  wbc: [7.2, 8.1, 9.4, 11.8, 13.6, 15.2, 18.4, 14.1, 11.2, 9.6],
  plt: [
    245,
    238,
    { value: 226, flag: 'A', note: 'Clumped; smear review' },
    204,
    182,
    160,
    142,
    151,
    168,
    190,
  ],
};

export const flowsheetValues: ObservationValue[] = Object.entries(readings).flatMap(
  ([observationId, list]) =>
    list.flatMap((reading, index) => {
      const at = new Date(flowsheetTimes[index] ?? 0).toISOString();
      if (reading === null) {
        return [];
      }
      return typeof reading === 'object'
        ? [{ observationId, at, ...reading }]
        : [{ observationId, at, value: reading }];
    }),
);
