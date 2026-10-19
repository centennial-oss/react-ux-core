import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Download, Mail, Pencil, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Selection } from 'react-aria-components';
import { Button } from '../Button';
import { Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger, SubmenuTrigger } from './Menu';
import { MenuButton, OverflowMenu, SplitButton } from './MenuButtons';

const meta = {
  title: 'Overlays/Menu',
  component: Menu,
  args: { children: null },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Exception: items with a shortcut hint or description expose that text as the item's description
          // (aria-describedby), the standard menu pattern, so axe's experimental label-content-name-mismatch rule
          // sees visible text outside the name. The visible label still starts each accessible name (WCAG 2.5.3).
          { id: 'label-content-name-mismatch', enabled: false },
        ],
      },
    },
  },
} satisfies Meta<typeof Menu>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Icons, shortcut hints, a disabled item, a separator and a destructive item. Opens as a sheet on phones. */
export const Actions: Story = {
  tags: ['visual-page'],
  render: () => (
    <MenuTrigger defaultOpen>
      <Button variant="outline">Actions</Button>
      <Menu>
        <MenuItem id="edit" icon={Pencil} shortcut="⌘E">
          Edit
        </MenuItem>
        <MenuItem id="duplicate" icon={Copy} shortcut="⌘D">
          Duplicate
        </MenuItem>
        <MenuItem id="export" icon={Download} description="CSV of the current view">
          Export
        </MenuItem>
        <MenuItem id="archive" isDisabled>
          Archive
        </MenuItem>
        <MenuSeparator />
        <MenuItem id="delete" icon={Trash2} tone="danger">
          Delete
        </MenuItem>
      </Menu>
    </MenuTrigger>
  ),
};

/** Radio (single) and checkbox (multiple) sections with headings. */
export const SelectionSections: Story = {
  tags: ['visual-page'],
  render: function SelectionStory() {
    const [sort, setSort] = useState<Selection>(new Set(['name']));
    const [columns, setColumns] = useState<Selection>(new Set(['status', 'owner']));
    return (
      <MenuTrigger defaultOpen>
        <Button variant="outline">View</Button>
        <Menu>
          <MenuSection
            title="Sort by"
            selectionMode="single"
            selectedKeys={sort}
            onSelectionChange={setSort}
          >
            <MenuItem id="name">Name</MenuItem>
            <MenuItem id="created">Date created</MenuItem>
          </MenuSection>
          <MenuSeparator />
          <MenuSection
            title="Columns"
            selectionMode="multiple"
            selectedKeys={columns}
            onSelectionChange={setColumns}
          >
            <MenuItem id="status">Status</MenuItem>
            <MenuItem id="owner">Owner</MenuItem>
            <MenuItem id="updated">Last updated</MenuItem>
          </MenuSection>
        </Menu>
      </MenuTrigger>
    );
  },
};

/** A choice row stays open while the selection changes (for example a theme switcher). */
export const ChoiceRow: Story = {
  tags: ['visual-page'],
  render: function ChoiceRowStory() {
    const [theme, setTheme] = useState<Selection>(new Set(['system']));
    return (
      <MenuTrigger defaultOpen>
        <Button variant="outline">Settings</Button>
        <Menu>
          <MenuSection
            title="Theme"
            layout="choice"
            selectedKeys={theme}
            onSelectionChange={setTheme}
          >
            <MenuItem id="system">System</MenuItem>
            <MenuItem id="light">Light</MenuItem>
            <MenuItem id="dark">Dark</MenuItem>
            <MenuItem id="high-contrast">High contrast</MenuItem>
          </MenuSection>
          <MenuSeparator />
          <MenuItem id="shortcuts">Keyboard shortcuts</MenuItem>
          <MenuItem id="help">Help</MenuItem>
        </Menu>
      </MenuTrigger>
    );
  },
};

export const Submenu: Story = {
  tags: ['!visual'],
  render: () => (
    <MenuTrigger>
      <Button variant="outline">File</Button>
      <Menu>
        <MenuItem id="new">New</MenuItem>
        <SubmenuTrigger>
          <MenuItem id="share" icon={Share2}>
            Share
          </MenuItem>
          <Menu>
            <MenuItem id="email" icon={Mail}>
              Email
            </MenuItem>
            <MenuItem id="link" icon={Copy}>
              Copy link
            </MenuItem>
          </Menu>
        </SubmenuTrigger>
      </Menu>
    </MenuTrigger>
  ),
};

/** MenuButton, SplitButton and OverflowMenu. */
export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <MenuButton label="Export" icon={Download}>
        <MenuItem id="csv">CSV</MenuItem>
        <MenuItem id="xlsx">Excel</MenuItem>
        <MenuItem id="pdf">PDF</MenuItem>
      </MenuButton>
      <SplitButton label="Save" onPress={() => undefined}>
        <MenuItem id="draft">Save as draft</MenuItem>
        <MenuItem id="template">Save as template</MenuItem>
      </SplitButton>
      <SplitButton label="Publish" variant="outline" tone="neutral" onPress={() => undefined}>
        <MenuItem id="schedule">Schedule…</MenuItem>
      </SplitButton>
      <OverflowMenu>
        <MenuItem id="rename">Rename</MenuItem>
        <MenuItem id="delete" tone="danger">
          Delete
        </MenuItem>
      </OverflowMenu>
    </div>
  ),
};
