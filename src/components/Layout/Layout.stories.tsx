import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { StatTile } from '../StatTile';
import { Grid, Inline, Spacer, Stack } from './Layout';

const meta = { title: 'Display/Layout', component: Stack } satisfies Meta<typeof Stack>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Stack: children in a column. Inline: a wrapping row. Grid: columns by the container's own width. */
export const Overview: Story = {
  render: () => (
    <Stack gap="lg">
      <Inline gap="sm">
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Low balance</Badge>
        <Spacer />
        <Button size="sm">Action</Button>
      </Inline>
      <Grid columns={{ base: 1, sm: 2, lg: 4 }}>
        <StatTile label="Customers" value="84" />
        <StatTile label="Payments today" value="KES 12.4K" />
        <StatTile label="Energy today" value="173 kWh" />
        <StatTile label="Losses" value="10.9 %" />
      </Grid>
      <Grid minItemWidth="16rem">
        <Card title="Auto-fill grid">Columns appear as space allows, each at least 16rem.</Card>
        <Card title="Second">Resize the viewport to see it reflow.</Card>
        <Card title="Third">No breakpoints needed.</Card>
      </Grid>
    </Stack>
  ),
};

export const InANarrowContainer: Story = {
  name: 'Grid in a narrow container',
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Grid columns={{ base: 1, sm: 2, lg: 4 }}>
        <StatTile label="Customers" value="84" />
        <StatTile label="Payments" value="KES 12.4K" />
      </Grid>
    </div>
  ),
};
