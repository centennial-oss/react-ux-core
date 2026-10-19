import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Menu, MenuItem, MenuSeparator } from '../Menu/Menu';
import { ContextMenuTrigger } from './ContextMenu';

const meta = {
  title: 'Overlays/ContextMenu',
  component: ContextMenuTrigger,
  args: { children: [<div key="target" />, <Menu key="menu" />] },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Exception: items with a shortcut hint expose it as the item's description (see the Menu stories).
          { id: 'label-content-name-mismatch', enabled: false },
        ],
      },
    },
  },
} satisfies Meta<typeof ContextMenuTrigger>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Right-click the card (or long-press it on a touch screen, or focus it and press Shift+F10) to open its menu where
 * you asked. The text field inside keeps the browser's own menu.
 */
export const Basic: Story = {
  render: function BasicStory() {
    const [last, setLast] = useState('none yet');
    return (
      <div className="flex flex-col gap-3">
        <ContextMenuTrigger>
          <div
            role="group"
            aria-label="Quarterly report"
            // The area is focusable so keyboard users can open its menu with Shift+F10.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a focusable group, per the comment above.
            tabIndex={0}
            className="flex h-40 w-full max-w-md flex-col gap-2 rounded-card border border-dashed border-border-strong bg-surface-2 p-4 text-sm text-fg outline-none focus-visible:focus-ring"
          >
            <span className="font-semibold">Quarterly report</span>
            <span className="text-fg-muted">Right-click anywhere in this card.</span>
            <input
              aria-label="Notes"
              placeholder="Text fields keep the browser menu"
              className="mt-auto rounded-control border border-border bg-surface-1 px-2 py-1"
            />
          </div>
          <Menu
            aria-label="Report actions"
            onAction={(key) => {
              setLast(String(key));
            }}
          >
            <MenuItem id="edit" icon={Pencil} shortcut="⌘E">
              Edit
            </MenuItem>
            <MenuItem id="duplicate" icon={Copy}>
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem id="delete" icon={Trash2} tone="danger">
              Delete
            </MenuItem>
          </Menu>
        </ContextMenuTrigger>
        <p className="text-sm text-fg-muted">Last action: {last}</p>
      </div>
    );
  },
};
