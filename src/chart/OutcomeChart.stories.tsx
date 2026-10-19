import type { Meta, StoryObj } from '@storybook/react-vite';
import { cometNews, cometOutcomes, DAY, MARKET_START } from '../../test/charts';
import { OutcomeChart } from './OutcomeChart';

const meta = {
  title: 'Chart/Outcomes',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Four outcomes over 90 days as lines, on a 0–100% axis, with three news events and the latest values in the legend. */
export const Lines: Story = {
  render: () => (
    <OutcomeChart
      title="When will the comet be brightest?"
      description="Market probabilities, daily, UTC"
      outcomes={cometOutcomes}
      events={cometNews}
      timeZone="UTC"
    />
  ),
};

/** The same market as stacked areas that fill to 100%. */
export const Stacked: Story = {
  render: () => (
    <OutcomeChart
      title="When will the comet be brightest?"
      description="Market probabilities, daily, UTC"
      outcomes={cometOutcomes}
      events={cometNews}
      mode="stacked"
      timeZone="UTC"
    />
  ),
};

/** Resolved: the winning outcome is drawn thicker and the rest faded, with a resolution marker. */
export const Resolved: Story = {
  render: () => (
    <OutcomeChart
      title="When will the comet be brightest?"
      description="Market probabilities, daily, UTC"
      outcomes={cometOutcomes}
      events={cometNews}
      resolution={{ outcomeId: 'late-oct', at: MARKET_START + 89 * DAY }}
      timeZone="UTC"
    />
  ),
};
