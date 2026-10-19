import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UIProvider } from '../provider/UIProvider';
import { ObservationTrend } from './ObservationTrend';
import type { Observation, ObservationValue } from './reference';

const values: ObservationValue[] = [
  { observationId: 'k', at: '2026-10-01T08:00:00Z', value: 4.1 },
  { observationId: 'k', at: '2026-10-02T08:00:00Z', value: 4.6 },
  { observationId: 'k', at: '2026-10-03T08:00:00Z', value: 4.3 },
];

function criticalLineCount(observation: Observation): number {
  const { container } = render(
    <UIProvider>
      <ObservationTrend observation={observation} values={values} timeZone="UTC" />
    </UIProvider>,
  );
  return container.querySelectorAll('line[stroke-dasharray]').length;
}

describe('ObservationTrend', () => {
  it('spans the values and reference range, not the critical limits', () => {
    // With no reference high, the critical low must not stretch the axis down to itself.
    expect(
      criticalLineCount({
        id: 'k',
        label: 'Potassium',
        referenceRange: { low: 3.9 },
        criticalRange: { low: 2.8, high: 6.2 },
      }),
    ).toBe(0);
  });

  it('dashes critical limits that fall inside the axis', () => {
    expect(
      criticalLineCount({
        id: 'k',
        label: 'Potassium',
        referenceRange: { low: 3.5, high: 5.1 },
        criticalRange: { low: 3.6, high: 6.2 },
      }),
    ).toBe(1);
  });
});
