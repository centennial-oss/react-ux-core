import { render, screen, within } from '@testing-library/react';
import { createRef, Profiler, useState } from 'react';
import { I18nProvider, type Key } from 'react-aria-components';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  DEFAULT_EDITOR_VIEW,
  editorMenus,
  nextEditorView,
  type EditorView,
} from '../../../test/menubar';
import { UIProvider } from '../../provider/UIProvider';
import { Menubar, type MenubarMenu } from './Menubar';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;
// Keyboard and hover walk-throughs run on the desktop instance (see DEVELOPER.md's testing tips).
const isDesktop = !isPhone && !hasTouch;

// Menu items expose shortcut hints as their description, so axe's experimental name-mismatch rule flags them; the
// visible label still starts each accessible name (see the stories).
const AXE_OPTIONS = { disabledRules: ['label-content-name-mismatch'] };

interface HarnessProps {
  onAction?: (key: Key) => void;
  items?: (view: EditorView) => MenubarMenu[];
}

/** The editor's menubar between two buttons, with View's checkable items following its state. */
function Harness({ onAction, items = editorMenus }: HarnessProps) {
  const [view, setView] = useState(DEFAULT_EDITOR_VIEW);
  return (
    <>
      {/* Above the bar, where no menu covers it. */}
      <p>Outside text</p>
      <button type="button">Before</button>
      <Menubar
        aria-label="Editor"
        items={items(view)}
        onAction={(key) => {
          onAction?.(key);
          setView((current) => nextEditorView(current, String(key)));
        }}
      />
      <button type="button">After</button>
    </>
  );
}

const bar = () => screen.getByRole('menubar', { name: 'Editor' });
const nameOf = (label: string) => within(bar()).getByRole('menuitem', { name: label });
const menuOf = (label: string) => screen.queryByRole('menu', { name: label });

/** The label of the focused menu item, or null when focus isn't on an item inside a menu. */
function focusedItem(): string | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active.closest('[role="menu"]') === null) {
    return null;
  }
  const labelId = active.getAttribute('aria-labelledby')?.split(' ')[0];
  return labelId === undefined ? null : (document.getElementById(labelId)?.textContent ?? null);
}

async function expectFocusOnName(label: string) {
  await expect.poll(() => document.activeElement, { timeout: 2000 }).toBe(nameOf(label));
}

async function expectFocusOnItem(label: string) {
  await expect.poll(focusedItem, { timeout: 2000 }).toBe(label);
}

/** Waits until only the menu named `label` is open (others finish closing). */
async function expectOnlyOpen(label: string | null) {
  await expect
    .poll(() => screen.queryAllByRole('menu').map((menu) => menu.getAttribute('aria-labelledby')))
    .toEqual(label === null ? [] : [nameOf(label).id]);
}

describe.runIf(!isPhone)('Menubar', () => {
  it('is a menubar of menu names with one Tab stop', async () => {
    const { container } = render(<Harness />);
    const names = within(bar()).getAllByRole('menuitem');
    expect(names.map((name) => name.textContent)).toEqual([
      'File',
      'Edit',
      'View',
      'Insert',
      'Help',
    ]);
    expect(names.map((name) => name.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    expect(nameOf('File').getAttribute('aria-haspopup')).not.toBeNull();
    expect(nameOf('File').getAttribute('aria-expanded')).toBe('false');
    expect(nameOf('Insert').getAttribute('aria-disabled')).toBe('true');
    await expectNoAxeViolations(container, AXE_OPTIONS);
  });

  it.runIf(isDesktop)(
    'moves between the names with the arrow keys, Home, End and typeahead',
    async () => {
      render(<Harness />);
      screen.getByRole('button', { name: 'Before' }).focus();
      await userEvent.keyboard('{Tab}');
      await expectFocusOnName('File');
      await userEvent.keyboard('{ArrowRight}');
      await expectFocusOnName('Edit');
      // The Tab stop follows focus.
      expect(nameOf('Edit').tabIndex).toBe(0);
      expect(nameOf('File').tabIndex).toBe(-1);
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
      await expectFocusOnName('Help');
      await userEvent.keyboard('{ArrowRight}');
      await expectFocusOnName('File');
      await userEvent.keyboard('{End}');
      await expectFocusOnName('Help');
      await userEvent.keyboard('{Home}');
      await expectFocusOnName('File');
      // Disabled menus can be focused, as the pattern asks.
      await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      await expectFocusOnName('Insert');
      await userEvent.keyboard('{Enter}{ArrowDown}');
      expect(screen.queryByRole('menu')).toBeNull();
      // Typeahead: characters typed together make one search, and focus stays when nothing matches.
      await userEvent.keyboard('h');
      await expectFocusOnName('Help');
      await userEvent.keyboard('e');
      await expectFocusOnName('Help');
      await userEvent.keyboard('z');
      await expectFocusOnName('Help');
      // Tab leaves the bar from its Tab stop, and Shift+Tab comes back to it.
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      await expectFocusOnName('Help');
    },
  );

  it.runIf(isDesktop)('walks through the menus and submenus with the keyboard', async () => {
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    nameOf('File').focus();

    // Down opens a menu on its first item.
    await userEvent.keyboard('{ArrowDown}');
    await expectFocusOnItem('New');
    expect(nameOf('File').getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard('{ArrowDown}');
    await expectFocusOnItem('Open…');

    // Right on an item without a submenu moves to the next menu; Left back.
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('Undo');
    await expectOnlyOpen('Edit');
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocusOnItem('New');
    await expectOnlyOpen('File');

    // Right on a submenu's item opens it, Left closes it back to its item.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expectFocusOnItem('Open recent');
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('report.md');
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocusOnItem('Open recent');
    expect(menuOf('File')).not.toBeNull();

    // Right inside a submenu, on an item without one, moves to the next top-level menu.
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('report.md');
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('Undo');
    await expectOnlyOpen('Edit');

    // Switching skips the disabled Insert menu and wraps round.
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('Toolbar');
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('Documentation');
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('New');

    // Escape closes the menu and returns focus to its name.
    await userEvent.keyboard('{Escape}');
    await expectFocusOnName('File');
    await expectOnlyOpen(null);

    // Up opens on the last item; Enter runs one (React Aria skips the disabled Print), closes the menu and returns
    // focus to the name.
    await userEvent.keyboard('{ArrowUp}');
    await expectFocusOnItem('Move to trash');
    await userEvent.keyboard('{ArrowUp}');
    await expectFocusOnItem('Save as…');
    await userEvent.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledWith('saveAs');
    await expectFocusOnName('File');
    await expectOnlyOpen(null);

    // Space opens too; Tab closes the menu and leaves the bar.
    await userEvent.keyboard(' ');
    await expectFocusOnItem('New');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
    await expectOnlyOpen(null);
  });

  it.runIf(isDesktop)(
    'shows checkable items and runs submenu items from the keyboard',
    async () => {
      const onAction = vi.fn();
      render(<Harness onAction={onAction} />);
      nameOf('View').focus();
      await userEvent.keyboard('{Enter}');
      await expectFocusOnItem('Toolbar');
      const view = screen.getByRole('menu', { name: 'View' });
      expect(within(view).getByRole('group', { name: 'Show' })).toBeInTheDocument();
      const wordWrap = within(view).getByRole('menuitemcheckbox', { name: 'Word wrap' });
      expect(wordWrap.getAttribute('aria-checked')).toBe('false');
      expect(
        within(view)
          .getByRole('menuitemcheckbox', { name: 'Toolbar' })
          .getAttribute('aria-checked'),
      ).toBe('true');
      expect(
        within(view).getByRole('menuitemradio', { name: '100%' }).getAttribute('aria-checked'),
      ).toBe('true');
      await expectNoAxeViolations(view, AXE_OPTIONS);

      // Enter on a checkbox item runs it (the app flips the state) and closes the menu.
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(onAction).toHaveBeenCalledWith('wordWrap');
      await expectFocusOnName('View');
      await userEvent.keyboard('{Enter}');
      await expectFocusOnItem('Toolbar');
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'Word wrap' }).getAttribute('aria-checked'),
      ).toBe('true');
      // A radio item.
      await userEvent.keyboard('{End}{ArrowUp}{Enter}');
      expect(onAction).toHaveBeenCalledWith('zoom-150');
      await expectFocusOnName('View');
      await userEvent.keyboard('{Enter}');
      await expectFocusOnItem('Toolbar');
      expect(screen.getByRole('menuitemradio', { name: '150%' }).getAttribute('aria-checked')).toBe(
        'true',
      );
      await userEvent.keyboard('{Escape}');

      // A submenu item.
      nameOf('Edit').focus();
      await userEvent.keyboard('{ArrowUp}');
      await expectFocusOnItem('Find');
      await userEvent.keyboard('{ArrowRight}');
      await expectFocusOnItem('Find…');
      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(onAction).toHaveBeenLastCalledWith('findNext');
      await expectOnlyOpen(null);
      await expectFocusOnName('Edit');
    },
  );

  it.runIf(isDesktop)('switches menus when another name is hovered while one is open', async () => {
    render(<Harness />);
    // Hovering does nothing while every menu is closed.
    await userEvent.hover(nameOf('Edit'));
    expect(screen.queryByRole('menu')).toBeNull();

    await userEvent.click(nameOf('File'));
    await expectOnlyOpen('File');
    await userEvent.hover(nameOf('Edit'));
    await expectOnlyOpen('Edit');
    await expect.poll(() => document.activeElement?.closest('[role="menu"]')).toBe(menuOf('Edit'));
    // The disabled menu doesn't take over.
    await userEvent.hover(nameOf('Insert'));
    await userEvent.hover(nameOf('Help'));
    await expectOnlyOpen('Help');
    // The arrow keys carry on from a menu opened by pointer.
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocusOnItem('Toolbar');
    await expectOnlyOpen('View');
  });

  it.runIf(!isPhone)('opens and closes with presses, inside and outside', async () => {
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    const press = async (label: string) => {
      if (hasTouch) {
        await commands.tap(`[role="menubar"] [data-key="${label.toLowerCase()}"]`);
      } else {
        await userEvent.click(nameOf(label));
      }
    };
    await press('File');
    await expectOnlyOpen('File');
    // Tapping another name switches menus. A mouse switches them as it moves onto the name (see the hover test).
    if (hasTouch) {
      await press('Edit');
    } else {
      await userEvent.hover(nameOf('Edit'));
    }
    await expectOnlyOpen('Edit');
    // Pressing the open menu's name closes it.
    await press('Edit');
    await expectOnlyOpen(null);
    // A press outside, on text that can't take focus, closes it.
    await press('Help');
    await expectOnlyOpen('Help');
    await userEvent.click(screen.getByText('Outside text'));
    await expectOnlyOpen(null);
    // Choosing an item.
    await press('File');
    await expectOnlyOpen('File');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save' }));
    expect(onAction).toHaveBeenCalledWith('save');
    await expectOnlyOpen(null);
    // The disabled menu never opens.
    await userEvent.click(nameOf('Insert'), { force: true });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it.runIf(!isPhone)('opens submenus by pointer and runs their items', async () => {
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    await userEvent.click(nameOf('File'));
    await expectOnlyOpen('File');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Open recent' }));
    const submenu = await screen.findByRole('menu', { name: 'Open recent' });
    await userEvent.click(within(submenu).getByRole('menuitem', { name: 'notes.md' }));
    expect(onAction).toHaveBeenCalledWith('recent-notes');
    await expectOnlyOpen(null);
  });

  it('writes command shortcuts in the platform’s keys, with the modifier names from UIProvider', async () => {
    const platform = Object.getOwnPropertyDescriptor(navigator, 'platform');
    const show = async (value: string) => {
      Object.defineProperty(navigator, 'platform', { value, configurable: true });
      const view = render(
        <UIProvider messages={{ modifierCtrl: 'Strg', modifierShift: 'Umschalt' }}>
          <Harness />
        </UIProvider>,
      );
      await userEvent.click(nameOf('File'));
      const menu = await screen.findByRole('menu', { name: 'File' });
      const hints = [...menu.querySelectorAll('kbd')].map((kbd) => kbd.textContent);
      view.unmount();
      return hints;
    };
    try {
      expect(await show('MacIntel')).toEqual(['⌘N', '⌘O', '⌘S', '⌘⇧S', '⌘P']);
      expect(await show('Linux x86_64')).toEqual([
        'Strg+N',
        'Strg+O',
        'Strg+S',
        'Strg+Umschalt+S',
        'Strg+P',
      ]);
    } finally {
      if (platform === undefined) {
        Reflect.deleteProperty(navigator, 'platform');
      } else {
        Object.defineProperty(navigator, 'platform', platform);
      }
    }
  });

  it('groups checkable items outside a section into one named by the menu', async () => {
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    await userEvent.click(nameOf('Help'));
    const help = await screen.findByRole('menu', { name: 'Help' });
    const tips = within(help).getByRole('menuitemcheckbox', { name: 'Show tips' });
    expect(tips.getAttribute('aria-checked')).toBe('false');
    expect(tips.closest('[role="group"]')?.getAttribute('aria-label')).toBe('Help');
    // The plain items around it stay plain.
    expect(within(help).getByRole('menuitem', { name: 'About' })).toBeInTheDocument();
    await userEvent.click(tips);
    expect(onAction).toHaveBeenCalledWith('tips');
    await expect
      .poll(() =>
        within(help)
          .getByRole('menuitemcheckbox', { name: 'Show tips' })
          .getAttribute('aria-checked'),
      )
      .toBe('true');
  });

  it('shows text shortcut hints as written', async () => {
    render(<Harness />);
    await userEvent.click(nameOf('View'));
    const menu = await screen.findByRole('menu', { name: 'View' });
    expect(within(menu).getByText('F11').tagName).toBe('KBD');
  });

  it.runIf(isDesktop)('mirrors the arrow keys right to left', async () => {
    render(
      <I18nProvider locale="he-IL">
        <div dir="rtl">
          <Harness />
        </div>
      </I18nProvider>,
    );
    nameOf('File').focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocusOnName('Edit');
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnName('File');
    await userEvent.keyboard('{ArrowDown}');
    await expectFocusOnItem('New');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expectFocusOnItem('Open recent');
    // Left opens the submenu right to left, and on an item without one moves to the next menu.
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocusOnItem('report.md');
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('Open recent');
    await userEvent.keyboard('{ArrowUp}');
    await expectFocusOnItem('Open…');
    await userEvent.keyboard('{ArrowLeft}');
    await expectFocusOnItem('Undo');
    await userEvent.keyboard('{ArrowRight}');
    await expectFocusOnItem('New');
  });

  it('stops rendering once a menu is open', async () => {
    // Inline ref callbacks that re-observe an element, or a state update on every focus change, would keep the
    // menubar re-rendering forever.
    let commits = 0;
    render(
      <Profiler
        id="menubar"
        onRender={() => {
          commits += 1;
        }}
      >
        <Harness />
      </Profiler>,
    );
    await userEvent.click(nameOf('Edit'));
    await expectOnlyOpen('Edit');
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return commits - before;
    };
    await expect.poll(settled, { timeout: 5000 }).toBe(0);
  });
});

describe.runIf(isPhone)('Menubar on phones', () => {
  it('is one menu button with each menu as a submenu', async () => {
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    expect(screen.queryByRole('menubar')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Editor' }));
    const menu = await screen.findByRole('menu');
    const names = within(menu).getAllByRole('menuitem');
    expect(names.map((name) => name.textContent)).toEqual([
      'File',
      'Edit',
      'View',
      'Insert',
      'Help',
    ]);
    expect(names.every((name) => name.getAttribute('aria-haspopup') !== null)).toBe(true);
    expect(
      within(menu).getByRole('menuitem', { name: 'Insert' }).getAttribute('aria-disabled'),
    ).toBe('true');
    await expectNoAxeViolations(menu, AXE_OPTIONS);

    await userEvent.click(within(menu).getByRole('menuitem', { name: 'File' }));
    const file = await screen.findByRole('menu', { name: 'File' });
    // The submenu opens over the sheet, on screen.
    await expect
      .poll(() => {
        const { left, right } = file.getBoundingClientRect();
        return left >= 0 && right <= window.innerWidth;
      })
      .toBe(true);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
    await userEvent.click(within(file).getByRole('menuitem', { name: 'New' }));
    expect(onAction).toHaveBeenCalledWith('new');
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
  });

  it('names the button by aria-label, or else the moreActions message', () => {
    render(
      <UIProvider messages={{ moreActions: 'Plus d’actions' }}>
        <h2 id="menus-heading">Menus</h2>
        <Menubar aria-labelledby="menus-heading" items={editorMenus()} />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Plus d’actions' })).toBeInTheDocument();
  });
});

describe('Menubar layout', () => {
  it('never makes the page scroll sideways', () => {
    render(<Harness />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('passes className, ref and data attributes to the root', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Menubar
        aria-label="Editor"
        items={editorMenus()}
        className="custom-bar"
        ref={ref}
        data-testid="menubar"
      />,
    );
    const root = screen.getByTestId('menubar');
    expect(ref.current).toBe(root);
    expect(root.classList.contains('custom-bar')).toBe(true);
    expect(root.getAttribute('role')).toBe(isPhone ? null : 'menubar');
  });
});
