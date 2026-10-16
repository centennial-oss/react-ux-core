import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { demoCountries, demoFlagPath, demoFlagRows, type DemoCountry } from '../../../test/flags';
import { Flag } from '../Flag/Flag';
import { FlagProvider } from '../Flag/FlagProvider';
import { FlagPicker } from './FlagPicker';

const meta = {
  title: 'Inputs/FlagPicker',
  component: FlagPicker,
  args: { rows: demoFlagRows },
  decorators: [
    (Story) => (
      <FlagProvider countries={demoCountries} basePath={demoFlagPath}>
        <Story />
      </FlagProvider>
    ),
  ],
} satisfies Meta<typeof FlagPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Choosing a flag hands back the country's registered data, including the app's own fields (here `currency`). */
export const ChoosingACountry: Story = {
  render: () => {
    const [country, setCountry] = useState<DemoCountry | null>(null);
    return (
      <div className="flex max-w-xs flex-col gap-4">
        <FlagPicker<DemoCountry>
          label="Country"
          rows={demoFlagRows}
          defaultValue="br"
          onChange={(_, next) => {
            setCountry(next);
          }}
        />
        <output className="flex flex-col gap-1 text-sm text-fg-muted">
          {country ? (
            <>
              <Flag country={country.code} details={['name', 'nativeName', 'languages']} />
              <span>Currency: {country.currency}</span>
            </>
          ) : (
            'Choose a country to see its data.'
          )}
        </output>
      </div>
    );
  },
};

/** Flags in titled rows that wrap to the panel; search by English name, native name or code. */
export const Open: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-xs">
      <FlagPicker label="Country" rows={demoFlagRows} defaultValue="fr" defaultOpen />
    </div>
  ),
};

/** Without names under the flags (screen readers still hear them), and without the search. */
export const Compact: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-xs">
      <FlagPicker
        label="Country"
        rows={demoFlagRows}
        hasLabels={false}
        isSearchable={false}
        defaultOpen
      />
    </div>
  ),
};
