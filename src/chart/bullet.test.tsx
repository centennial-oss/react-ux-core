import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import { UIProvider } from '../provider/UIProvider';
import { BulletChart, niceTicks } from './BulletChart';

function Hours(props: { value?: number }) {
  return (
    <BulletChart
      label="Observing hours"
      value={props.value ?? 1_840}
      target={2_000}
      ranges={[
        { to: 1_500, label: 'Behind' },
        { to: 1_900, label: 'On track' },
        { to: 2_400, label: 'Ahead' },
      ]}
      unit="h"
    />
  );
}

describe('niceTicks', () => {
  it('picks round steps and keeps both ends', () => {
    expect(niceTicks(0, 100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(0, 2_400)).toEqual([0, 1_000, 2_000, 2_400]);
    expect(niceTicks(0, 1)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(5, 5)).toEqual([5]);
  });
});

describe('BulletChart', () => {
  it('is a meter whose text gives the value, the target and the range', () => {
    render(<Hours />);
    const meter = screen.getByRole('meter', { name: 'Observing hours' });
    expect(meter).toHaveAttribute('aria-valuetext', '1,840 h, target 2,000 h, On track');
    expect(meter).toHaveAttribute('aria-valuemax', '2400');
    // The range's name shows too, so the bands' shades aren't the only signal.
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('target 2,000 h')).toBeInTheDocument();
  });

  it('places the measure, the target and the ranges on the scale', () => {
    const { container } = render(<Hours />);
    const spans = Array.from(container.querySelectorAll<HTMLElement>('[style]'));
    const percents = (property: 'width' | 'insetInlineStart') =>
      spans.flatMap((span) =>
        span.style[property] ? [Number.parseFloat(span.style[property])] : [],
      );
    const near = (values: number[], expected: number) =>
      values.some((value) => Math.abs(value - expected) < 0.01);
    expect(near(percents('width'), (1_500 / 2_400) * 100)).toBe(true);
    expect(near(percents('width'), (1_840 / 2_400) * 100)).toBe(true);
    expect(near(percents('insetInlineStart'), (2_000 / 2_400) * 100)).toBe(true);
    expect(screen.getByText('2,400')).toBeInTheDocument();
  });

  it('counts values past the last range in it, and below the first in the first', () => {
    const { rerender } = render(<Hours value={2_600} />);
    expect(screen.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      '2,600 h, target 2,000 h, Ahead',
    );
    rerender(<Hours value={-10} />);
    expect(screen.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      '-10 h, target 2,000 h, Behind',
    );
  });

  it('works without ranges or a target', () => {
    render(<BulletChart label="Storage" value={61} maxValue={100} unit="TB" hasScale={false} />);
    expect(screen.getByRole('meter', { name: 'Storage' })).toHaveAttribute(
      'aria-valuetext',
      '61 TB',
    );
    expect(screen.queryByText('100')).not.toBeInTheDocument();
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider messages={{ bulletTarget: ({ target }: { target: string }) => `goal ${target}` }}>
        <Hours />
      </UIProvider>,
    );
    expect(screen.getByText('goal 2,000 h')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Hours />);
    await expectNoAxeViolations(container);
  });
});
