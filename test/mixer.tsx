// A small mixing desk for the vertical Slider (fader) and Knob stories and tests: channel strips with a pan knob over a
// level fader, in a region that scrolls sideways inside its container.
import { useState } from 'react';
import { Knob } from '../src/components/Knob/Knob';
import { ScrollRegion } from '../src/components/ScrollRegion/ScrollRegion';
import { Slider } from '../src/components/Slider/Slider';

/** Fader marks in decibels. */
export const faderTicks = [
  { value: 6, label: '+6' },
  { value: 0, label: '0' },
  { value: -10, label: '−10' },
  { value: -20, label: '−20' },
  { value: -40, label: '−40' },
  { value: -60, label: '−60' },
];

interface Channel {
  name: string;
  level: number;
  pan: number;
}

// Deterministic starting levels and pans, so screenshots are stable.
const initialChannels = (count: number): Channel[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `Ch ${String(index + 1)}`,
    level: [-6, -12, 0, -18, -3, -24, -9, -15][index % 8] ?? 0,
    pan: [0, -30, 30, -60, 60, -15, 15, 0][index % 8] ?? 0,
  }));

export function Mixer({ channels: count = 16 }: { channels?: number }) {
  const [channels, setChannels] = useState(() => initialChannels(count));
  const update = (index: number, patch: Partial<Channel>) => {
    setChannels((current) =>
      current.map((channel, i) => (i === index ? { ...channel, ...patch } : channel)),
    );
  };
  return (
    <ScrollRegion aria-label="Mixer" maxHeight="none" className="overflow-x-auto p-2">
      <div className="flex w-max gap-1">
        {channels.map((channel, index) => (
          <div
            key={channel.name}
            role="group"
            aria-label={channel.name}
            className="flex w-16 flex-col items-center gap-2 rounded-control bg-surface-2 py-2"
          >
            <Knob
              aria-label={`Pan ${channel.name}`}
              size="sm"
              minValue={-100}
              maxValue={100}
              isBipolar
              value={channel.pan}
              onChange={(pan) => {
                update(index, { pan });
              }}
              formatOptions={{ signDisplay: 'exceptZero' }}
              isValueEditable={false}
            />
            <Slider
              aria-label={`Level ${channel.name}`}
              orientation="vertical"
              minValue={-60}
              maxValue={6}
              step={0.5}
              value={channel.level}
              onChange={(level) => {
                update(index, { level });
              }}
              formatOptions={{ signDisplay: 'exceptZero', maximumFractionDigits: 1 }}
              ticks={faderTicks.map(({ value }) => ({ value }))}
            />
            <span className="text-xs font-medium text-fg">{channel.name}</span>
          </div>
        ))}
      </div>
    </ScrollRegion>
  );
}
