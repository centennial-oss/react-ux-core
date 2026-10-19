import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { demoCommands, loadDemoReadings } from '../../../test/commandPalette';
import { Text } from '../Text';
import { CommandPalette } from './CommandPalette';
import { CommandPaletteTrigger } from './CommandPaletteTrigger';

const meta = {
  title: 'Overlays/CommandPalette',
  component: CommandPalette,
  args: { items: demoCommands },
} satisfies Meta<typeof CommandPalette>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Open, before typing: recent items first, then the pages and actions by section. Type to filter (try "mars m",
 * then Enter); arrow keys move, Escape closes. A full-screen sheet on phones.
 */
export const Open: Story = {
  tags: ['visual-page'],
  render: function Render(args) {
    const [recent, setRecent] = useState<string[]>(['mars-moons', 'observatories']);
    return (
      <CommandPalette
        {...args}
        defaultOpen
        shortcut={null}
        recentIds={recent}
        onRecentChange={setRecent}
      />
    );
  },
};

/**
 * In an app header: the trigger shows the shortcut (⌘K or Ctrl+K) where there's a keyboard and is icon-only on
 * phones. Press it or the shortcut; typing a number or "reading" also searches lab readings (async, after a pause).
 * Chosen items move to "Recent".
 */
export const WithTrigger: Story = {
  render: function Render(args) {
    const [isOpen, setOpen] = useState(false);
    const [recent, setRecent] = useState<string[]>([]);
    const [last, setLast] = useState('');
    const items = args.items.map((item) => ({
      ...item,
      href: undefined,
      onAction: () => {
        setLast(item.label);
      },
    }));
    return (
      <div className="flex flex-col gap-4">
        <div className="flex h-14 items-center justify-between gap-3 rounded-card border border-border bg-surface-1 px-4">
          <span className="font-semibold">Observatory</span>
          <CommandPaletteTrigger
            onPress={() => {
              setOpen(true);
            }}
          />
        </div>
        <Text variant="small">{last === '' ? 'Nothing run yet.' : `Ran: ${last}`}</Text>
        <CommandPalette
          items={items}
          loadItems={(query, signal) => loadDemoReadings(query, signal)}
          isOpen={isOpen}
          onOpenChange={setOpen}
          recentIds={recent}
          onRecentChange={setRecent}
        />
      </div>
    );
  },
};

/** The trigger on its own, and icon-only for tight headers. */
export const Triggers: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <CommandPaletteTrigger />
      <CommandPaletteTrigger label="Search pages" shortcut="/" />
      <CommandPaletteTrigger isIconOnly />
    </div>
  ),
};
