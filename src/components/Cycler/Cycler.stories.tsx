import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Cycler, type CyclerOption } from './Cycler';

const months: CyclerOption<number>[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((label, index) => ({ id: index + 1, label }));

// A century of years, paged by decade in the picker.
const years: CyclerOption<number>[] = Array.from({ length: 101 }, (_, index) => {
  const year = 1925 + index;
  const decade = year - (year % 10);
  return {
    id: year,
    label: String(year),
    group: `${String(Math.max(decade, 1925))} – ${String(Math.min(decade + 9, 2025))}`,
  };
});

const meta = {
  title: 'Inputs/Cycler',
  component: Cycler<number>,
  args: { 'aria-label': 'Month', options: months, defaultValue: 3 },
} satisfies Meta<typeof Cycler<number>>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Arrows step (hold one to keep going) and wrap from December to January. Press the month to jump to any. */
export const Months: Story = {
  render: function MonthsStory() {
    const [month, setMonth] = useState(3);
    return <Cycler aria-label="Month" options={months} value={month} onChange={setMonth} />;
  },
};

/** A long list pages through the picker by `group`: a decade at a time, opening on the current one. */
export const Years: Story = {
  render: () => (
    <Cycler
      aria-label="Year"
      options={years}
      defaultValue={1987}
      isLooping={false}
      pickerColumns={5}
    />
  ),
};

const shirtSizes: CyclerOption[] = [
  { id: 'xs', label: 'XS' },
  { id: 's', label: 'S' },
  { id: 'm', label: 'M' },
  { id: 'l', label: 'L', isDisabled: true },
  { id: 'xl', label: 'XL' },
];

/** Sizes, a sold-out option the arrows skip, an arrows-only cycler and a disabled one. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Cycler aria-label="Month" options={months} defaultValue={9} size="sm" />
      <Cycler aria-label="Shirt size" options={shirtSizes} defaultValue="m" pickerColumns={5} />
      <Cycler aria-label="Month" options={months} defaultValue={1} hasPicker={false} />
      <Cycler aria-label="Month" options={months} defaultValue={6} isDisabled />
    </div>
  ),
};

/** The picker open, on the month grid. */
export const OpenPicker: Story = {
  tags: ['visual-page'],
  render: () => <Cycler aria-label="Month" options={months} defaultValue={3} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Month March' }));
  },
};
