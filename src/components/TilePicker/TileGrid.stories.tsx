import type { Meta, StoryObj } from '@storybook/react-vite';
import { Coffee, Flag, Salad, Soup, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { Text } from '../Text';
import { TileGrid, type TileOption, type TileStatus } from './TileGrid';

const meta = {
  title: 'Inputs/TileGrid',
  component: TileGrid,
  args: { items: [] },
} satisfies Meta<typeof TileGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

const answered: TileStatus = { tone: 'success', label: 'Answered' };
const unanswered: TileStatus = { tone: 'neutral', label: 'Unanswered' };
const flagged: TileStatus = { tone: 'warning', label: 'Flagged', icon: Flag };

const questions: TileOption[] = Array.from({ length: 65 }, (_, index) => {
  const number = index + 1;
  const status = number % 9 === 0 ? flagged : number < 24 ? answered : unanswered;
  return {
    id: String(number),
    label: String(number),
    textValue: `Question ${String(number)}`,
    status,
  };
});

/** A 65-question navigator: compact tiles that jump to a question, with the current one marked and a legend. */
export const QuestionNavigator: Story = {
  render: () => {
    const [current, setCurrent] = useState('24');
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <TileGrid
          label="Questions"
          items={questions}
          density="compact"
          selectionMode="none"
          currentId={current}
          onAction={setCurrent}
          legend={[answered, unanswered, flagged]}
        />
        <Text variant="muted">Question {current}</Text>
      </div>
    );
  },
};

const initials = (name: string) => (
  <div className="flex h-20 items-center justify-center bg-accent-bg text-2xl font-semibold text-accent-fg">
    {name
      .split(' ')
      .map((part) => part[0])
      .join('')}
  </div>
);

const candidates: TileOption[] = [
  'Ada Lovelace',
  'Grace Hopper',
  'Katherine Johnson',
  'Alan Turing',
  'Edsger Dijkstra',
].map((name, index) => ({
  id: String(index),
  label: name,
  media: initials(name),
  description: ['Engineering', 'Operations', 'Research', 'Security', 'Platform'][index],
}));

/** A voter card: choose up to three. Once three are chosen, the rest disable and the count is announced. */
export const VoterCard: Story = {
  render: () => (
    <div className="max-w-3xl">
      <TileGrid
        label="Board candidates"
        description="Vote for the people you'd like on the board."
        items={candidates}
        selectionMode="multiple"
        maxSelected={3}
        defaultValue={['0', '3']}
        minTileWidth="10rem"
      />
    </div>
  ),
};

const dish = (icon: typeof Soup) => {
  const Icon = icon;
  return (
    <div className="flex h-16 items-center justify-center bg-surface-3 text-fg-muted">
      <Icon aria-hidden="true" className="size-7" />
    </div>
  );
};

const menu: TileOption[] = [
  {
    id: 'soup',
    label: 'Tom yum',
    media: dish(Soup),
    description: 'Hot and sour, with prawns',
    footer: '$9.50',
  },
  {
    id: 'salad',
    label: 'Larb',
    media: dish(Salad),
    description: 'Minced chicken, herbs, lime',
    footer: '$11.00',
  },
  {
    id: 'noodles',
    label: 'Pad Thai',
    media: dish(UtensilsCrossed),
    description: 'Rice noodles, tamarind, peanuts',
    footer: '$13.00',
    status: { tone: 'danger', label: 'Sold out' },
    isDisabled: true,
  },
  {
    id: 'coffee',
    label: 'Thai iced coffee',
    media: dish(Coffee),
    description: 'With condensed milk',
    footer: '$4.00',
  },
];

/** Menu items: card tiles with media, a description and a price; one choice, with a sold-out item. */
export const MenuItems: Story = {
  render: () => (
    <div className="max-w-3xl">
      <TileGrid label="Main course" items={menu} selectionMode="single" defaultValue={['salad']} />
    </div>
  ),
};

/** A read-only results view: the choices stay readable, and nothing can change. */
export const ReadOnlyResults: Story = {
  render: () => (
    <div className="max-w-3xl">
      <TileGrid
        label="Your votes"
        items={candidates}
        selectionMode="multiple"
        value={['1', '2']}
        isReadOnly
        minTileWidth="10rem"
      />
    </div>
  ),
};
