import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { chatCommands, loadMentions } from '../../test/chat';
import { Composer, ComposerReplyContext, type ComposerProps } from './Composer';

const send: ComposerProps['onSubmit'] = () => undefined;

const meta = {
  title: 'Chat/Composer',
  component: Composer,
  args: {
    onSubmit: send,
    loadMentions,
    commands: chatCommands,
    hasAttachments: true,
    hasEmoji: true,
  },
  // Suggestions open upwards, as a composer sits at the bottom of a chat.
  decorators: [
    (Story) => (
      <div className="flex min-h-80 flex-col justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Type "@" to mention someone, "/" at the start for commands, paste or drop an image to attach it, or open the
 * emoji picker. Enter sends; Shift+Enter adds a line. The (i) button lists the shortcuts.
 */
export const Basic: Story = {};

/** Replying to a message: the context bar above the text, with a cancel button. */
export const Replying: Story = {
  render: function ReplyingStory(args) {
    const [isReplying, setReplying] = useState(true);
    return (
      <Composer
        {...args}
        context={
          isReplying ? (
            <ComposerReplyContext
              author="Ada Lovelace"
              excerpt="Focus drifted around 3 AM; I think the temperature dropped faster than forecast."
              onCancel={() => {
                setReplying(false);
              }}
            />
          ) : undefined
        }
      />
    );
  },
};

/** ⌘/Ctrl+Enter sends and Enter adds a line, for longer notes. */
export const ModEnter: Story = {
  args: {
    sendKey: 'mod-enter',
    minRows: 3,
    defaultValue: 'Night log:\n- M51 mosaic, 4 of 6 panels',
  },
};

/** Near the length limit, a counter shows; past it, sending is blocked. */
export const MaxLength: Story = {
  args: {
    maxLength: 80,
    defaultValue: 'Clouds clear by 22:00, humidity under 70%. We should get a full night on M51.',
  },
};

/** Sending fails: the text stays, with an error. */
export const SendFails: Story = {
  tags: ['!visual'],
  args: {
    defaultValue: 'Dome closing at dawn',
    onSubmit: () =>
      new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('offline'));
        }, 800);
      }),
  },
};

export const Disabled: Story = {
  args: { isDisabled: true, placeholder: 'You can’t post in this channel' },
};
