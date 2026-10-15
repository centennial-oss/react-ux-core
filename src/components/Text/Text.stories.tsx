import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '../Layout';
import { Heading, Text } from './Text';

const meta = { title: 'Display/Text', component: Text } satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <Stack gap="sm">
      <Heading level={2}>Section heading</Heading>
      <Heading level={3}>Subsection heading</Heading>
      <Text>Default body text, in the app's type scale.</Text>
      <Text tone="muted">Muted text for secondary details.</Text>
      <Text tone="success">Success</Text>
      <Text tone="warning">Warning</Text>
      <Text tone="danger">Danger</Text>
      <Text isMono>S60R-04A3B2</Text>
      <Text isNumeric size="lg" weight="semibold">
        1,234.50
      </Text>
    </Stack>
  ),
};
