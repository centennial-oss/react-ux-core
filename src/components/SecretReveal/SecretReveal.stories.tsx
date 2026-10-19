import type { Meta, StoryObj } from '@storybook/react-vite';
import { SecretReveal } from './SecretReveal';

const meta = { title: 'Display/SecretReveal', component: SecretReveal } satisfies Meta<
  typeof SecretReveal
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NewApiClient: Story = {
  args: {
    items: [
      { id: 'key', label: 'Key', value: 'tco_7hq2kx4m', isSecret: false },
      { id: 'secret', label: 'Secret', value: 'q8Wn3vT1zLp6Rk2YbH9sDf4Gc7Jm5Ae0' },
    ],
  },
};
