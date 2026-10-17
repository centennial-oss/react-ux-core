import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ReactionBar } from './ReactionBar';
import type { ChatReaction } from './types';

const reactions: ChatReaction[] = [
  { emoji: '🔭', count: 3, isMine: false, names: ['Grace Hopper', 'Edwin Hubble', 'SkyGuide'] },
  { emoji: '👍', count: 2, isMine: true, names: ['Ada Lovelace', 'Edwin Hubble'] },
  { emoji: '🌙', count: 1, isMine: false, names: ['Grace Hopper'] },
];

const meta = {
  title: 'Chat/ReactionBar',
  component: ReactionBar,
  args: { reactions, onToggle: () => undefined },
  render: function ReactionBarStory(args) {
    const [current, setCurrent] = useState(args.reactions);
    return (
      <ReactionBar
        {...args}
        reactions={current}
        onToggle={(emoji) => {
          setCurrent((list) => {
            const existing = list.find((reaction) => reaction.emoji === emoji);
            if (!existing) {
              return [...list, { emoji, count: 1, isMine: true, names: ['Ada Lovelace'] }];
            }
            return list
              .map((reaction) =>
                reaction.emoji === emoji
                  ? {
                      ...reaction,
                      isMine: !reaction.isMine,
                      count: reaction.count + (reaction.isMine ? -1 : 1),
                    }
                  : reaction,
              )
              .filter((reaction) => reaction.count > 0);
          });
        }}
      />
    );
  },
} satisfies Meta<typeof ReactionBar>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Toggle chips with counts; quick reactions (👍 here) come first. Who reacted is in the tooltip and the button's
 * description, and toggling announces the new count. The last button adds a reaction from the picker.
 */
export const Basic: Story = {};

/** Read-only: reactions show, but can't be changed or added. */
export const ReadOnly: Story = {
  args: { isDisabled: true, canAdd: false },
};

/** Your own quick reactions. */
export const CustomQuick: Story = {
  args: { quick: ['🌙', '🔭'] },
};
