import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('is an image with a generated summary', () => {
    render(<Sparkline data={[3, 9, 18, 12, 9]} />);
    expect(
      screen.getByRole('img', { name: '5 values from 3 to 18, latest 9' }),
    ).toBeInTheDocument();
  });

  it('formats the summary for the locale', () => {
    render(
      <UIProvider locale="de-DE">
        <Sparkline data={[1500.5, 2500.25]} formatOptions={{ maximumFractionDigits: 2 }} />
      </UIProvider>,
    );
    expect(
      screen.getByRole('img', { name: '2 values from 1.500,5 to 2.500,25, latest 2.500,25' }),
    ).toBeInTheDocument();
  });

  it('accepts a custom label, or can be hidden', () => {
    const { container } = render(
      <>
        <Sparkline data={[1, 2]} aria-label="Daily usage, rising" />
        <Sparkline data={[1, 2]} aria-hidden />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Daily usage, rising' })).toBeInTheDocument();
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(1);
  });

  it('draws a line, bars, markers, baseline and threshold', () => {
    const { container } = render(
      <>
        <Sparkline data={[3, 9, 18]} hasMinMaxMarkers baseline={10} threshold={{ value: 15 }} />
        <Sparkline data={[3, 9, 18]} type="bar" />
      </>,
    );
    const [line, bars] = [...container.querySelectorAll('svg')];
    expect(line?.querySelector('polyline')).toBeInTheDocument();
    expect(line?.querySelector('line')).toBeInTheDocument();
    expect(line?.querySelector('rect')).toBeInTheDocument();
    expect(bars?.querySelectorAll('rect')).toHaveLength(3);
    expect(container.querySelectorAll('span.rounded-full')).toHaveLength(2);
  });

  it('says "No data" for an empty series', () => {
    render(<Sparkline data={[]} />);
    expect(screen.getByRole('img', { name: 'No data' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Sparkline data={[1, 5, 3]} />);
    await expectNoAxeViolations(container);
  });
});

describe('Sparkline areas', () => {
  it('shades below the line, fading toward the bottom', () => {
    const { container } = render(
      <Sparkline data={[1, 3, 2]} type="area" shadeOpacity={0.4} fade={50} aria-label="Trend" />,
    );
    const stops = [...container.querySelectorAll('linearGradient stop')];
    expect(stops.map((stop) => Number(stop.getAttribute('stop-opacity')))).toEqual([0.4, 0.2]);
    const polygon = container.querySelector('polygon');
    expect(polygon?.getAttribute('fill')).toMatch(/^url\(#rux-spark-/);
  });
});
