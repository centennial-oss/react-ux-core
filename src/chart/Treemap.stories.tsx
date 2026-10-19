import type { Meta, StoryObj } from '@storybook/react-vite';
import { storageBySite } from '../../test/plotCharts';
import { Treemap, type TreemapNode } from './Treemap';

const meta = {
  title: 'Chart/Treemap',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const percentChange = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'percent', signDisplay: 'exceptZero' }).format(
    value / 100,
  );

/**
 * Storage use by instrument at three sites (40 instruments), coloured by the change on last month: green for growth,
 * red for shrinking. Press a site's header (or Enter on it) to drill in, and the breadcrumbs (or Backspace) to come
 * back. Arrow keys move between rectangles, each named with its value and share.
 */
export const StorageBySite: Story = {
  render: () => (
    <Treemap
      title="Storage by instrument"
      description="Terabytes, change on last month"
      data={storageBySite}
      unit="TB"
      colorScale={{ type: 'diverging', midpoint: 0, min: -12, max: 12, colors: 'danger-success' }}
      formatColorValue={percentChange}
      colorValueLabel="Change"
      exportFileName="storage-by-instrument"
      height="22rem"
    />
  ),
};

/** Opened on one site (`defaultPath`), with the trail back to all sites. */
export const DrilledIn: Story = {
  render: () => (
    <Treemap
      title="Storage by instrument"
      data={storageBySite}
      unit="TB"
      formatColorValue={percentChange}
      defaultPath={['atacama']}
    />
  ),
};

const withoutChange = (node: TreemapNode): TreemapNode => ({
  ...node,
  colorValue: undefined,
  children: node.children?.map(withoutChange),
});

/** Coloured by site from the chart palette, without a second metric. */
export const PaletteColours: Story = {
  render: () => (
    <Treemap title="Storage by instrument" data={withoutChange(storageBySite)} unit="TB" />
  ),
};
