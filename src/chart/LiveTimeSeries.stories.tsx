import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef } from 'react';
import { domes, LIVE_START, trackingError, trackingHistory } from '../../test/charts';
import { LiveTimeSeries, type LiveTimeSeriesHandle } from './LiveTimeSeries';

const meta = {
  title: 'Chart/Live',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const FIVE_MINUTES = 5 * 60_000;

/**
 * Tracking error for three telescope domes at 10 points a second, over a 5-minute window, started from history (a
 * still frame: nothing streams). Hover or touch the plot to pause it; the Pause button does the same.
 */
export const TrackingError: Story = {
  render: () => (
    <LiveTimeSeries
      title="Telescope tracking error"
      description="Last 5 minutes, 10 readings a second, UTC"
      series={domes}
      windowMs={FIVE_MINUTES}
      defaultData={trackingHistory(300)}
      thresholds={[{ value: 1.6, label: 'Limit', tone: 'danger' }]}
      timeZone="UTC"
    />
  ),
};

/** Paused: the chip says how many points arrived since, and Resume catches up. */
export const Paused: Story = {
  render: () => (
    <LiveTimeSeries
      title="Telescope tracking error"
      series={domes}
      windowMs={FIVE_MINUTES}
      defaultData={trackingHistory(300)}
      defaultPaused
      timeZone="UTC"
    />
  ),
};

function Streaming() {
  const handle = useRef<LiveTimeSeriesHandle>(null);
  useEffect(() => {
    // Ten readings a second for each dome, generated on animation frames (the story's clock, not the chart's).
    let next = LIVE_START + 60_000;
    const started = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const due = LIVE_START + 60_000 + (now - started);
      while (next <= due) {
        const t = next;
        domes.forEach((dome, index) => {
          handle.current?.append(dome.id, [{ t, v: trackingError(index, t) }]);
        });
        next += 100;
      }
      frame = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <LiveTimeSeries
      title="Telescope tracking error"
      description="Last minute, 10 readings a second, UTC"
      series={domes}
      windowMs={60_000}
      defaultData={trackingHistory(60)}
      handleRef={handle}
      timeZone="UTC"
    />
  );
}

/** Streaming: three series at 10 points a second, keeping two minutes of points. */
export const Live: Story = {
  tags: ['!visual'],
  render: () => <Streaming />,
};
