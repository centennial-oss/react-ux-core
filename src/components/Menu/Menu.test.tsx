import { render, screen, within } from '@testing-library/react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Selection } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger, SubmenuTrigger } from './Menu';
import { MenuButton, OverflowMenu, SplitButton } from './MenuButtons';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

async function openMenu(name: string) {
  await userEvent.click(screen.getByRole('button', { name }));
  const menu = await screen.findByRole('menu');
  // Phone sheets animate in, so focus may land a moment later.
  await expect.poll(() => menu.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return menu;
}

/** Opens with the keyboard (focus the trigger, press Enter), which focuses the first item. */
async function openMenuWithKeyboard(name: string) {
  screen.getByRole('button', { name }).focus();
  await userEvent.keyboard('{Enter}');
  const menu = await screen.findByRole('menu');
  // React Aria focuses the menu, then its first item once the overlay has finished entering.
  await expect.poll(() => document.querySelector('[data-entering]'), { timeout: 2000 }).toBeNull();
  await expect
    .poll(() => document.activeElement?.getAttribute('role')?.startsWith('menuitem') ?? false, {
      timeout: 2000,
    })
    .toBe(true);
  return menu;
}

function Actions({ onAction = vi.fn() }: { onAction?: (key: unknown) => void }) {
  return (
    <MenuTrigger>
      <Button>Actions</Button>
      <Menu aria-label="Record actions" onAction={onAction}>
        <MenuItem id="edit" icon={Pencil} shortcut="⌘E">
          Edit
        </MenuItem>
        <MenuItem id="duplicate" icon={Copy}>
          Duplicate
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
  );
}

/** A File menu whose Share item opens a submenu. */
function FileWithSubmenu() {
  return (
    <MenuTrigger>
      <Button>File</Button>
      <Menu aria-label="File">
        <MenuItem id="new">New</MenuItem>
        <SubmenuTrigger>
          <MenuItem id="share">Share</MenuItem>
          <Menu aria-label="Share">
            <MenuItem id="email">Email</MenuItem>
            <MenuItem id="link">Copy link</MenuItem>
          </Menu>
        </SubmenuTrigger>
      </Menu>
    </MenuTrigger>
  );
}

describe('Menu', () => {
  it('opens from its trigger with focus on the first item', async () => {
    render(<Actions />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    const menu = await openMenuWithKeyboard('Actions');
    // A triggered menu is labelled by its trigger.
    expect(menu.getAttribute('aria-labelledby')).toBe(trigger.id);
    await expect
      .poll(() => document.activeElement)
      .toBe(within(menu).getByRole('menuitem', { name: /Edit/ }));
  });

  it('moves with arrow keys and typeahead, and calls onAction with the item id', async () => {
    const onAction = vi.fn();
    render(<Actions onAction={onAction} />);
    const menu = await openMenuWithKeyboard('Actions');
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(within(menu).getByRole('menuitem', { name: /Duplicate/ }));
    // Typeahead: typing a prefix jumps to the matching item.
    await userEvent.keyboard('del');
    expect(document.activeElement).toBe(within(menu).getByRole('menuitem', { name: /Delete/ }));
    await userEvent.keyboard('{Enter}');
    expect(onAction.mock.calls[0]?.[0]).toBe('delete');
    await expect.poll(() => screen.queryByRole('menu'), { timeout: 3000 }).toBeNull();
  });

  it('skips disabled items and shows shortcut hints and separators', async () => {
    render(<Actions />);
    const menu = await openMenuWithKeyboard('Actions');
    expect(within(menu).getByRole('menuitem', { name: 'Archive' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // Edit → Duplicate → (Archive is disabled) → Delete
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(within(menu).getByRole('menuitem', { name: /Delete/ }));
    expect(within(menu).getByText('⌘E').tagName).toBe('KBD');
    expect(within(menu).getByRole('separator')).toBeInTheDocument();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<Actions />);
    await openMenu('Actions');
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('menu'), { timeout: 3000 }).toBeNull();
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('button', { name: 'Actions' }));
  });

  it('has radio and checkbox sections with headings', async () => {
    function View() {
      const [sort, setSort] = useState<Selection>(new Set(['name']));
      const [columns, setColumns] = useState<Selection>(new Set(['status']));
      return (
        <MenuTrigger>
          <Button>View</Button>
          <Menu aria-label="View options">
            <MenuSection
              title="Sort by"
              selectionMode="single"
              selectedKeys={sort}
              onSelectionChange={setSort}
            >
              <MenuItem id="name">Name</MenuItem>
              <MenuItem id="date">Date</MenuItem>
            </MenuSection>
            <MenuSection
              title="Columns"
              selectionMode="multiple"
              selectedKeys={columns}
              onSelectionChange={setColumns}
            >
              <MenuItem id="status">Status</MenuItem>
              <MenuItem id="owner">Owner</MenuItem>
            </MenuSection>
          </Menu>
        </MenuTrigger>
      );
    }
    render(<View />);
    const menu = await openMenu('View');
    expect(within(menu).getByRole('group', { name: 'Sort by' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const owner = within(menu).getByRole('menuitemcheckbox', { name: 'Owner' });
    await userEvent.click(owner);
    expect(owner).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('keeps a choice row open while changing the selection', async () => {
    function Settings() {
      const [theme, setTheme] = useState<Selection>(new Set(['system']));
      return (
        <MenuTrigger>
          <Button>Settings</Button>
          <Menu aria-label="Settings">
            <MenuSection
              title="Theme"
              layout="choice"
              selectedKeys={theme}
              onSelectionChange={setTheme}
            >
              <MenuItem id="system">System</MenuItem>
              <MenuItem id="light">Light</MenuItem>
              <MenuItem id="dark">Dark</MenuItem>
            </MenuSection>
            <MenuItem id="help">Help</MenuItem>
          </Menu>
        </MenuTrigger>
      );
    }
    render(<Settings />);
    const menu = await openMenu('Settings');
    const dark = within(menu).getByRole('menuitemradio', { name: 'Dark' });
    await userEvent.click(dark);
    expect(dark).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitemradio', { name: 'System' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('menu', { name: 'Settings' })).toBeInTheDocument();
  });

  it('opens submenus from the keyboard', async () => {
    render(<FileWithSubmenu />);
    const menu = await openMenuWithKeyboard('File');
    const share = within(menu).getByRole('menuitem', { name: 'Share' });
    expect(share).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.keyboard('{ArrowDown}{ArrowRight}');
    const submenu = await screen.findByRole('menu', { name: 'Share' });
    // It opens beside its item, not below it; on phones, where the sheet leaves no room beside it, over the sheet.
    expect(isPhone ? ['top', 'bottom'] : ['left', 'right']).toContain(
      submenu.closest('[data-trigger="SubmenuTrigger"]')?.getAttribute('data-placement'),
    );
    // Focus moves into the submenu once it has finished entering, which takes longer under load.
    await expect.poll(() => submenu.contains(document.activeElement), { timeout: 3000 }).toBe(true);
  });

  it.runIf(isPhone)('keeps submenus on screen on phones', async () => {
    render(<FileWithSubmenu />);
    const menu = await openMenu('File');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Share' }));
    const submenu = await screen.findByRole('menu', { name: 'Share' });
    await expect
      .poll(() => {
        const { left, right } = submenu.getBoundingClientRect();
        return left >= 0 && right <= window.innerWidth;
      })
      .toBe(true);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it.runIf(isPhone)('opens as a bottom sheet on phones', async () => {
    render(<Actions />);
    const menu = await openMenu('Actions');
    expect(menu.closest('[data-position="bottom"]')).not.toBeNull();
  });

  it.runIf(!isPhone)('opens as an anchored popover on tablet and desktop', async () => {
    render(<Actions />);
    const menu = await openMenu('Actions');
    expect(menu.closest('[data-placement]')).not.toBeNull();
  });

  it('has no accessibility violations when open', async () => {
    render(<Actions />);
    const menu = await openMenu('Actions');
    // Exception (as in the Menu stories): shortcut hints are exposed as the item's description, the standard menu
    // pattern, which axe's label-content-name-mismatch rule reads as visible text outside the name.
    await expectNoAxeViolations(menu, { disabledRules: ['label-content-name-mismatch'] });
  });
});

describe('MenuButton, SplitButton and OverflowMenu', () => {
  it('MenuButton opens its menu', async () => {
    const onAction = vi.fn();
    render(
      <MenuButton label="Export" onAction={onAction}>
        <MenuItem id="csv">CSV</MenuItem>
        <MenuItem id="pdf">PDF</MenuItem>
      </MenuButton>,
    );
    const menu = await openMenu('Export');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'PDF' }));
    expect(onAction.mock.calls[0]?.[0]).toBe('pdf');
  });

  it('SplitButton has a primary action and a labelled menu button', async () => {
    const onPress = vi.fn();
    const onAction = vi.fn();
    render(
      <SplitButton label="Save" onPress={onPress} onAction={onAction}>
        <MenuItem id="draft">Save as draft</MenuItem>
      </SplitButton>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    const menu = await openMenu('More options');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Save as draft' }));
    expect(onAction.mock.calls[0]?.[0]).toBe('draft');
  });

  it('OverflowMenu is labelled "More actions" by default', async () => {
    render(
      <OverflowMenu>
        <MenuItem id="rename">Rename</MenuItem>
      </OverflowMenu>,
    );
    const menu = await openMenu('More actions');
    expect(within(menu).getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument();
  });
});
