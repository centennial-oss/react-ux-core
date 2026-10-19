import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkline } from './Sparkline';

const SERIES = [12, 15, 11, 18, 22, 19, 25, 21, 28, 24, 30, 27];

const meta = {
  title: 'Display/Sparkline',
  component: Sparkline,
  args: { data: SERIES },
} satisfies Meta<typeof Sparkline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-sm gap-6">
      <Sparkline data={SERIES} />
      <Sparkline data={SERIES} hasMinMaxMarkers tone="success" />
      <Sparkline data={SERIES} type="bar" tone="neutral" />
      <Sparkline data={SERIES} baseline={20} threshold={{ value: 26 }} tone="warning" height={48} />
      <Sparkline data={[]} />
    </div>
  ),
};

const trend = [12, 18, 15, 22, 30, 26, 34, 31, 40, 37, 45, 42];

/** Areas: a shade below the line, which can fade toward the bottom (`fade` 0, 50 and 100). */
export const Areas: Story = {
  render: () => (
    <div className="flex w-48 flex-col gap-4">
      <Sparkline data={trend} type="area" aria-label="No fade" />
      <Sparkline
        data={trend}
        type="area"
        fade={50}
        shadeOpacity={0.35}
        tone="success"
        aria-label="Fade 50"
      />
      <Sparkline
        data={trend}
        type="area"
        fade={100}
        shadeOpacity={0.5}
        tone="warning"
        aria-label="Fade 100"
      />
    </div>
  ),
};
