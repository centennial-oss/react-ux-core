import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../Button';
import { Text } from '../Text';
import { ReorderableList, type ReorderableItem } from './ReorderableList';

const planets: ReorderableItem[] = [
  { id: 'mercury', label: 'Mercury', description: 'The smallest planet' },
  { id: 'venus', label: 'Venus', description: 'The hottest planet' },
  { id: 'earth', label: 'Earth', description: 'The only one with liquid water on its surface' },
  { id: 'mars', label: 'Mars', description: 'The red planet' },
  { id: 'jupiter', label: 'Jupiter', description: 'The largest planet' },
];

const meta = {
  title: 'Inputs/ReorderableList',
  component: ReorderableList,
  args: { items: planets },
} satisfies Meta<typeof ReorderableList>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Put the planets in order from the Sun: drag a handle, or use the move buttons. Each move is announced. */
export const Procedure: Story = {
  render: () => {
    const [order, setOrder] = useState(['mars', 'mercury', 'jupiter', 'earth', 'venus']);
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <ReorderableList
          label="Put the planets in order from the Sun"
          description="Drag a planet by its handle, or move it with the arrows."
          items={planets}
          value={order}
          onChange={setOrder}
        />
        <Text variant="small">Order: {order.join(', ')}</Text>
      </div>
    );
  },
};

/** After checking: read-only, with each planet marked right or wrong in place. */
export const CheckedAnswer: Story = {
  render: () => (
    <div className="max-w-xl">
      <ReorderableList
        label="Your order"
        items={planets}
        value={['mercury', 'earth', 'venus', 'mars', 'jupiter']}
        isReadOnly
        feedback={{
          mercury: { tone: 'success', message: 'Correct position' },
          earth: { tone: 'danger', message: 'Should be third' },
          venus: { tone: 'danger', message: 'Should be second' },
          mars: { tone: 'success', message: 'Correct position' },
          jupiter: { tone: 'success', message: 'Correct position' },
        }}
      />
    </div>
  ),
};

const answerKey = ['mercury', 'venus', 'earth', 'mars', 'jupiter'];

/**
 * The same mounted list locks after "Check answer": `isReadOnly` and `feedback` switch on, and "Try again" unlocks
 * it. (Before checking it looks like the Procedure story, so it has no visual snapshot of its own.)
 */
export const CheckedAnswerLocksAfterCheck: Story = {
  name: 'Checked answer (locks after Check)',
  tags: ['!visual'],
  render: () => {
    const [order, setOrder] = useState(['venus', 'mercury', 'earth', 'jupiter', 'mars']);
    const [isChecked, setChecked] = useState(false);
    const feedback = Object.fromEntries(
      order.map((id, index) => [
        id,
        id === answerKey[index]
          ? { tone: 'success' as const, message: 'Correct position' }
          : {
              tone: 'danger' as const,
              message: `Should be number ${String(answerKey.indexOf(id) + 1)}`,
            },
      ]),
    );
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <ReorderableList
          label="Put the planets in order from the Sun"
          items={planets}
          value={order}
          onChange={setOrder}
          isReadOnly={isChecked}
          feedback={isChecked ? feedback : undefined}
        />
        <div>
          <Button
            onPress={() => {
              setChecked(!isChecked);
            }}
          >
            {isChecked ? 'Try again' : 'Check answer'}
          </Button>
        </div>
      </div>
    );
  },
};

/** A disabled item can't move, and the small size. */
export const DisabledItemAndSmall: Story = {
  render: () => (
    <div className="max-w-xl">
      <ReorderableList
        label="Observing plan"
        size="sm"
        items={[
          { id: 'moon', label: 'Sketch the Moon’s terminator' },
          {
            id: 'jupiter',
            label: 'Count Jupiter’s moons',
            description: 'Set by your teacher',
            isDisabled: true,
          },
          { id: 'orion', label: 'Find the Orion Nebula' },
        ]}
      />
    </div>
  ),
};
