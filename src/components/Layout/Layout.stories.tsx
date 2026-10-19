import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { StatTile } from '../StatTile';
import { Grid, Inline, Spacer, Stack, type Space } from './Layout';

const meta = {
  title: 'Display/Layout',
  component: Stack,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Stack>;
export default meta;
type Story = StoryObj<typeof meta>;

function Box({ children }: { children: string }) {
  return (
    <span className="rounded-control border border-border bg-surface-3 px-3 py-2 text-sm text-fg">
      {children}
    </span>
  );
}

const gaps: Space[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl'];

/** A column stack (the default), a row stack, and Inline: a row that wraps, with a Spacer pushing an action to the end. */
export const Stacks: Story = {
  render: () => (
    <Stack gap="lg">
      <Stack>
        <Box>Column</Box>
        <Box>stretches</Box>
        <Box>each child</Box>
      </Stack>
      <Stack direction="row">
        <Box>Row</Box>
        <Box>stays on</Box>
        <Box>one line</Box>
      </Stack>
      <Inline>
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Low balance</Badge>
        <Spacer />
        <Button size="sm">Action</Button>
      </Inline>
    </Stack>
  ),
};

/** Every gap, from none to xl. */
export const Gaps: Story = {
  render: () => (
    <Stack gap="lg">
      {gaps.map((gap) => (
        <Stack key={gap} direction="row" gap={gap} aria-label={gap}>
          <Box>{gap}</Box>
          <Box>B</Box>
          <Box>C</Box>
        </Stack>
      ))}
    </Stack>
  ),
};

/** A wrapping row in a narrow space. */
export const WrappingRow: Story = {
  render: () => (
    <div className="max-w-64">
      <Stack direction="row" isWrapping gap="sm">
        {['Mechanics', 'Waves', 'Optics', 'Electricity', 'Magnetism', 'Astronomy'].map((name) => (
          <Badge key={name}>{name}</Badge>
        ))}
      </Stack>
    </div>
  ),
};

const tiles = (
  <>
    <StatTile label="Customers" value="84" />
    <StatTile label="Payments today" value="KES 12.4K" />
    <StatTile label="Energy today" value="173 kWh" />
    <StatTile label="Losses" value="10.9 %" />
  </>
);

/** Grids by a fixed count, by counts per container width, and by a minimum item width. */
export const Grids: Story = {
  render: () => (
    <Stack gap="xl">
      <Grid columns={2}>{tiles}</Grid>
      <Grid columns={{ base: 1, sm: 2, lg: 4 }}>{tiles}</Grid>
      <Grid minItemWidth="12rem">{tiles}</Grid>
    </Stack>
  ),
};

/** Columns follow the container, not the screen: inside a narrow card the same grid stays at one or two columns. */
export const GridInANarrowCard: Story = {
  render: () => (
    <div className="max-w-sm">
      <Card title="This month">
        <Grid columns={{ base: 1, sm: 2, lg: 4 }}>{tiles}</Grid>
      </Card>
    </div>
  ),
};

/** Lists: each child is rendered in an li. */
export const AsAList: Story = {
  render: () => (
    <Grid as="ul" aria-label="Inner planets" columns={{ base: 2, md: 4 }} gap="sm">
      {['Mercury', 'Venus', 'Earth', 'Mars'].map((planet) => (
        <Box key={planet}>{planet}</Box>
      ))}
    </Grid>
  ),
};
