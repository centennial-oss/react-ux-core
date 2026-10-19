import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { I18nProvider } from 'react-aria-components';
import { expect, waitFor } from 'storybook/test';
import { generateOrg, observatoryOrg } from '../../../test/org';
import { Avatar } from '../../components/Avatar/Avatar';
import { DescriptionList } from '../../components/DescriptionList/DescriptionList';
import { OrgChart } from './OrgChart';

const meta = {
  title: 'Graph/OrgChart',
  component: OrgChart,
  parameters: { layout: 'padded' },
  args: { people: observatoryOrg, title: 'Observatory staff' },
} satisfies Meta<typeof OrgChart>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A 26-person observatory. The director's assistant hangs beside her line; Science's five astronomers, who have no
 * reports, hang in pairs down Mara's line instead of making one wide row. Two levels start expanded: the buttons on
 * Dev's and Hana's cards show how many people are under them.
 */
export const Observatory: Story = {};

/** Everyone expanded. */
export const Expanded: Story = {
  args: { defaultExpandedDepth: Infinity },
};

/** Left to right: managers before their reports, which suits wide screens and long titles. */
export const LeftToRight: Story = {
  args: { layout: 'left-to-right', defaultExpandedDepth: Infinity },
};

/** Cards drawn by the app with `renderPerson`, sized with `cardSize`. */
export const CustomCards: Story = {
  args: {
    defaultExpandedDepth: Infinity,
    cardSize: { width: 184, height: 52 },
    renderPerson: (person, { isSelected }) => (
      <div
        className={
          isSelected
            ? 'flex size-full items-center gap-2 rounded-control border border-accent-solid bg-accent-bg px-2'
            : 'flex size-full items-center gap-2 rounded-control border border-border bg-surface-1 px-2'
        }
      >
        <Avatar name={person.name} src={person.avatarSrc} size="sm" aria-hidden="true" />
        <div className="flex min-w-0 flex-col">
          <div className="truncate text-xs font-semibold text-fg">{person.name}</div>
          <div className="truncate text-xs text-fg-muted">{person.title}</div>
        </div>
      </div>
    ),
  },
};

/** Selection drives a details panel beside the chart (an inspector, or a Drawer in an app). */
export const WithDetails: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<string | null>('kenji');
    const person = observatoryOrg.find((candidate) => candidate.id === selected);
    const manager = observatoryOrg.find((candidate) => candidate.id === person?.managerId);
    return (
      <div className="flex flex-col gap-4">
        <OrgChart {...args} selectedId={selected} onSelectionChange={setSelected} />
        <section
          aria-label="Person details"
          className="rounded-card border border-border bg-surface-1 p-4"
        >
          {person ? (
            <DescriptionList
              items={[
                { id: 'name', label: 'Name', value: person.name },
                { id: 'title', label: 'Title', value: person.title ?? '—' },
                { id: 'manager', label: 'Manager', value: manager?.name ?? '—' },
              ]}
            />
          ) : (
            <p className="text-sm text-fg-muted">Select a person to see their details.</p>
          )}
        </section>
      </div>
    );
  },
};

/**
 * A generated 5,000-person company. Two levels start expanded, the chart starts at its top at a readable zoom, and
 * only the people near the view are drawn; zoomed far out (try "Zoom to fit") people become plain boxes.
 */
export const FiveThousandPeople: Story = {
  args: { title: 'Company', height: '36rem' },
  render: function Render(args) {
    const people = useMemo(() => generateOrg(5000), []);
    return <OrgChart {...args} people={people} />;
  },
};

/** Search opens the path to each match and centres it; Enter, or the arrows, go to the next one. */
export const Search: Story = {
  tags: ['!visual'],
  args: { defaultSearch: 'engineer' },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('1 of 6')).toBeVisible();
    });
  },
};

/** Right to left: the first report is on the right, and Left and Right are mirrored. */
export const RightToLeft: Story = {
  render: (args) => (
    <I18nProvider locale="he-IL">
      <div dir="rtl">
        <OrgChart {...args} />
      </div>
    </I18nProvider>
  ),
};
