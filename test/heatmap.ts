// Deterministic data for the heatmap stories and tests.

export const topics = [
  { id: 'kinematics', label: 'Motion in one dimension' },
  { id: 'forces', label: 'Newton’s laws of motion' },
  { id: 'energy', label: 'Work, energy and power' },
  { id: 'waves', label: 'Waves and sound' },
  { id: 'light', label: 'Light and optics' },
  { id: 'orbits', label: 'Gravity and orbits' },
];

export const weeks = ['Sep 7', 'Sep 14', 'Sep 21', 'Sep 28', 'Oct 5', 'Oct 12'].map(
  (label, index) => ({
    id: `w${String(index + 1)}`,
    label,
  }),
);

/** Quiz scores by topic and week: rising over the weeks, with some weeks not yet practised. */
export const scores: (number | null)[][] = topics.map((_, row) =>
  weeks.map((__, column) => {
    if ((row + column) % 7 === 5) {
      return null;
    }
    return Math.round(40 + column * 7 + ((row * 13) % 17) - row * 2);
  }),
);

/** Study sessions per day over six months, as a calendar heatmap's values. */
export function studyDays(start: string, days: number): Record<string, number> {
  const first = Date.parse(`${start}T00:00:00Z`);
  const values: Record<string, number> = {};
  for (let day = 0; day < days; day++) {
    const sessions = (day * 7) % 11 < 4 ? 0 : ((day * 5) % 4) + 1;
    if (sessions > 0) {
      values[new Date(first + day * 86_400_000).toISOString().slice(0, 10)] = sessions;
    }
  }
  return values;
}
