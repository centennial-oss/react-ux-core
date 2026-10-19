import type { Meta, StoryObj } from '@storybook/react-vite';
import { energyLinks, energyNodes } from '../../test/moreCharts';
import { SankeyChart } from './SankeyChart';

const meta = {
  title: 'Chart/Sankey',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The observatory's energy for a year, from its sources through the switchboard to its uses: each band is as wide
 * as its flow, coloured by where it goes (`linkColor="target"`). Hover or tap a band or node to highlight its flows; the table lists every
 * flow with its share of its source.
 */
export const Energy: Story = {
  render: () => (
    <SankeyChart
      title="Site energy"
      description="This year"
      nodes={energyNodes}
      links={energyLinks}
      unit="MWh"
      linkColor="target"
      exportFileName="site-energy"
      height="22rem"
    />
  ),
};

/** Two columns, straight from sources to uses. */
export const TwoColumns: Story = {
  render: () => (
    <SankeyChart
      title="Proposal time by instrument"
      nodes={[
        { id: 'stars', label: 'Stellar' },
        { id: 'galaxies', label: 'Galaxies' },
        { id: 'planets', label: 'Exoplanets' },
        { id: 'echelle', label: 'Echelle', color: 'chart-5' },
        { id: 'imager', label: 'Imager', color: 'chart-6' },
      ]}
      links={[
        { source: 'stars', target: 'echelle', value: 120 },
        { source: 'stars', target: 'imager', value: 40 },
        { source: 'galaxies', target: 'imager', value: 150 },
        { source: 'galaxies', target: 'echelle', value: 30 },
        { source: 'planets', target: 'echelle', value: 90 },
      ]}
      unit="hours"
    />
  ),
};
