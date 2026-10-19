import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { I18nProvider, type Key } from 'react-aria-components';
import { waitFor } from 'storybook/test';
import {
  DEFAULT_EDITOR_VIEW,
  editorMenus,
  nextEditorView,
  type EditorView,
} from '../../../test/menubar';
import { Menubar } from './Menubar';

const isPhone = () => window.matchMedia('(max-width: 639.98px)').matches;

/** Waits for focus to reach the menu item labelled `label`: React Aria moves focus a moment after a key press. */
async function focusLandsOn(label: string) {
  await waitFor(() => {
    const active = document.activeElement;
    if (active?.closest('[role="menu"]') == null || !active.textContent.startsWith(label)) {
      throw new Error(`Focus isn't on ${label} yet.`);
    }
  });
}

const meta = {
  title: 'Overlays/Menubar',
  component: Menubar,
  args: { items: editorMenus(), 'aria-label': 'Editor' },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Exception, as for Menu: items with a shortcut hint expose it as the item's description (aria-describedby),
          // the standard menu pattern, so axe's experimental label-content-name-mismatch rule sees visible text
          // outside the name. The visible label still starts each accessible name (WCAG 2.5.3).
          { id: 'label-content-name-mismatch', enabled: false },
        ],
      },
    },
  },
} satisfies Meta<typeof Menubar>;
export default meta;
type Story = StoryObj<typeof meta>;

function Editor({ size }: { size?: 'sm' | 'md' }) {
  const [view, setView] = useState<EditorView>(DEFAULT_EDITOR_VIEW);
  const [chosen, setChosen] = useState<Key | null>(null);
  return (
    <div className="flex max-w-3xl flex-col rounded-card border border-border">
      <Menubar
        aria-label="Editor"
        size={size}
        items={editorMenus(view)}
        onAction={(key) => {
          setChosen(key);
          setView((current) => nextEditorView(current, String(key)));
        }}
        className="border-b border-border p-1"
      />
      <p className="p-4 text-sm text-fg-muted">
        {chosen === null ? 'Choose a menu item.' : `Chose ${String(chosen)}.`} Zoom {view.zoom}%,
        showing {[...view.panels].join(', ') || 'no panels'}.
      </p>
    </div>
  );
}

/**
 * File, Edit, View, a disabled Insert and Help. Tab to the bar, then use the arrow keys: Left and Right move between
 * the menus (and switch the open one), Down opens one. With a menu open, hovering another menu's name switches to it.
 * View's checkbox and radio items follow the app's state. On phones the bar is one menu button.
 */
export const Basic: Story = {
  render: () => <Editor />,
};

/** The View menu open: checkbox and radio sections, a separator and a plain-text shortcut hint. */
export const ViewMenuOpen: Story = {
  tags: ['visual-page'],
  render: () => <Editor />,
  play: async ({ canvas, userEvent }) => {
    if (isPhone()) {
      await userEvent.click(canvas.getByRole('button', { name: 'Editor' }));
      return;
    }
    canvas.getByRole('menuitem', { name: 'View' }).focus();
    await userEvent.keyboard('{Enter}');
  },
};

/** The File menu with its Open recent submenu, opened from the keyboard. */
export const Submenu: Story = {
  tags: ['visual-page'],
  render: () => <Editor />,
  play: async ({ canvas, userEvent }) => {
    if (isPhone()) {
      await userEvent.click(canvas.getByRole('button', { name: 'Editor' }));
      return;
    }
    canvas.getByRole('menuitem', { name: 'File' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    await focusLandsOn('New');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await focusLandsOn('Open recent');
    await userEvent.keyboard('{ArrowRight}');
  },
};

/** `md` names, as tall as the medium Button. The default is `sm`. */
export const Medium: Story = {
  render: () => <Editor size="md" />,
};

/** Right to left: the first menu is on the right, and Left and Right are mirrored. */
export const RightToLeft: Story = {
  render: () => (
    <I18nProvider locale="he-IL">
      <div dir="rtl">
        <Editor />
      </div>
    </I18nProvider>
  ),
};
