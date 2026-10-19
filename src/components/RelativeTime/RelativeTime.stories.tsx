import type { Meta, StoryObj } from '@storybook/react-vite';
import { RelativeTime } from './RelativeTime';

const meta = {
  title: 'Display/RelativeTime',
  component: RelativeTime,
  args: { value: 0 },
} satisfies Meta<typeof RelativeTime>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Hover, focus or tap a time to see the exact timestamp. Times stay current without one timer per element. */
export const Examples: Story = {
  render: function ExamplesStory() {
    const now = Date.now();
    return (
      <ul className="flex flex-col gap-2 text-sm text-fg">
        <li>
          Last reading <RelativeTime value={now - 20_000} />
        </li>
        <li>
          Synced <RelativeTime value={now - 5 * 60_000} />
        </li>
        <li>
          Created <RelativeTime value={now - 3 * 86_400_000} timeZone="Europe/Berlin" />
        </li>
        <li>
          Renews <RelativeTime value={now + 12 * 86_400_000} />
        </li>
      </ul>
    );
  },
};
