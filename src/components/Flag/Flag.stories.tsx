import type { Meta, StoryObj } from '@storybook/react-vite';
import { demoCountries, demoFlagPath } from '../../../test/flags';
import { Flag } from './Flag';
import { FlagProvider } from './FlagProvider';

const meta = {
  title: 'Display/Flag',
  component: Flag,
  args: { country: 'France' },
  // The app registers its countries and image path once, near the root.
  decorators: [
    (Story) => (
      <FlagProvider countries={demoCountries} basePath={demoFlagPath}>
        <Story />
      </FlagProvider>
    ),
  ],
} satisfies Meta<typeof Flag>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The stock countries, by name or code, with their English and native names and languages. */
export const StockCountries: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {['United States', 'France', 'cn', 'br'].map((country) => (
        <Flag key={country} country={country} details={['name', 'nativeName', 'languages']} />
      ))}
    </div>
  ),
};

/** Three sizes; alone, a flag is named for screen readers by its country. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Flag country="jp" size="sm" />
      <Flag country="jp" />
      <Flag country="jp" size="lg" />
      <Flag country="Japan" size="lg" details={['name', 'code']} />
    </div>
  ),
};

/** Countries the app registered, and a name nobody registered (a generic flag). */
export const RegisteredAndUnknown: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Flag country="Deutschland" details={['nativeName', 'name']} />
      <Flag country="Peru" details={['name', 'languages']} />
      <Flag country="Atlantis" details={['name']} />
    </div>
  ),
};
