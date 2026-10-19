import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { loadEmojiData, type SkinTone } from './emojiData';
import { EmojiPicker, EmojiPickerButton } from './EmojiPicker';

const meta = {
  title: 'Chat/EmojiPicker',
  component: EmojiPicker,
  args: { onSelect: () => undefined, shouldAutoFocus: false },
  // The data loads on first use; loading it first keeps the stories deterministic.
  loaders: [
    async () => {
      await loadEmojiData();
      return {};
    },
  ],
  render: (args) => (
    <div className="inline-flex rounded-card border border-border bg-surface-2 p-2 shadow-raised">
      <EmojiPicker {...args} />
    </div>
  ),
} satisfies Meta<typeof EmojiPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Categories with jump buttons, keyword search, a preview of the focused emoji's name, and skin tones. */
export const Basic: Story = {};

/** Recently used emoji first, and a chosen skin tone. */
export const RecentAndSkinTone: Story = {
  args: { recent: ['👍', '🔭', '🌙', '🎉', '✨'], defaultSkinTone: 4 },
};

/** Opened from a button, in a popover (a bottom sheet on phones); the choice shows beside it. */
export const PickerButton: Story = {
  tags: ['visual-page'],
  render: function PickerButtonStory() {
    const [chosen, setChosen] = useState<string[]>([]);
    const [tone, setTone] = useState<SkinTone>(1);
    const [isOpen, setOpen] = useState(true);
    return (
      <div className="flex min-h-[30rem] items-end gap-2">
        <EmojiPickerButton
          onSelect={(emoji) => {
            setChosen((current) => [emoji, ...current].slice(0, 8));
          }}
          recent={chosen}
          skinTone={tone}
          onSkinToneChange={setTone}
          isOpen={isOpen}
          onOpenChange={setOpen}
          shouldAutoFocus={false}
        />
        <output className="text-2xl">{chosen.join(' ')}</output>
      </div>
    );
  },
};
