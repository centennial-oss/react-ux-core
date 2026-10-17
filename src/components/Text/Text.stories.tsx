import type { Meta, StoryObj } from '@storybook/react-vite';
import { Code } from '../Code';
import { Stack } from '../Layout';
import { Heading, Text } from './Text';

const meta = {
  title: 'Display/Text',
  component: Text,
  args: { children: 'Body text.' },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Headings, and each Text variant. */
export const Variants: Story = {
  render: () => (
    <Stack gap="sm">
      <Heading level={2}>Section heading</Heading>
      <Heading level={3}>Subsection heading</Heading>
      <Text variant="lead">A lead paragraph introduces the page in a slightly larger size.</Text>
      <Text>
        Body text, in the app&apos;s type scale, with inline code such as <Code>F = ma</Code>.
      </Text>
      <Text variant="muted">Muted text for secondary details.</Text>
      <Text variant="small">Small text for notes and fine print.</Text>
    </Stack>
  ),
};

/** Clamping to one to four lines; the full text stays in the page for screen readers. */
export const Clamped: Story = {
  render: () => (
    <Stack gap="md" className="max-w-sm">
      {([1, 2, 3] as const).map((lines) => (
        <Text key={lines} lines={lines}>
          A ball is thrown horizontally at 12 metres per second from the top of a 45-metre cliff.
          Ignoring air resistance, how long does it take to reach the ground, how far from the base
          of the cliff does it land, and how fast is it moving just before it hits?
        </Text>
      ))}
    </Stack>
  ),
};
