import { render, screen, within } from '@testing-library/react';
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Copy,
  Italic,
  Link,
  Scissors,
  Trash2,
  Underline,
} from 'lucide-react';
import { createRef, useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { Button } from '../Button/Button';
import { Separator } from '../Separator/Separator';
import { ToggleButton, ToggleButtonGroup } from '../ToggleButton/ToggleButton';
import { Toolbar, type ToolbarItem } from './Toolbar';

const hasTouch = navigator.maxTouchPoints > 0;

// Icon-only items at the default size are 40 px squares with 4 px gaps, so widths are easy to reason about.
const ICON_ITEMS: ToolbarItem[] = [
  { id: 'bold', label: 'Bold', icon: Bold, isIconOnly: true },
  { id: 'italic', label: 'Italic', icon: Italic, isIconOnly: true },
  { id: 'underline', label: 'Underline', icon: Underline, isIconOnly: true },
  { id: 'link', label: 'Link', icon: Link, isIconOnly: true },
  { id: 'cut', label: 'Cut', icon: Scissors, isIconOnly: true },
  { id: 'copy', label: 'Copy', icon: Copy, isIconOnly: true },
];

/** Waits for `count` animation frames, so resize observers have run. */
async function frames(count: number) {
  for (let index = 0; index < count; index++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

function Box({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div data-testid="box" style={{ width, maxWidth: '100%' }}>
      {children}
    </div>
  );
}

function toolbar() {
  return screen.getByRole('toolbar');
}

/** The names of the item buttons showing in the bar (not the "More actions" button). */
function barNames(): string[] {
  return Array.from(
    toolbar().querySelectorAll('[data-toolbar-item] button'),
    (button) => button.getAttribute('aria-label') ?? button.textContent,
  );
}

function moreButton() {
  return screen.queryByRole('button', { name: 'More actions' });
}

async function openMore() {
  const more = moreButton();
  if (!more) {
    throw new Error('No More actions button');
  }
  await userEvent.click(more);
  return screen.findByRole('menu');
}

describe('Toolbar', () => {
  it('is a labelled toolbar that arrow keys move through, with one Tab stop', async () => {
    render(
      <>
        <Toolbar aria-label="Formatting">
          <Button>Cut</Button>
          <Button>Copy</Button>
          <Separator orientation="vertical" />
          <Button>Paste</Button>
        </Toolbar>
        <button type="button">After</button>
      </>,
    );
    expect(toolbar()).toHaveAccessibleName('Formatting');
    expect(toolbar()).toHaveAttribute('aria-orientation', 'horizontal');
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Cut' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Paste' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    // Coming back returns to the control used last.
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus();
  });

  it('follows a vertical orientation with the up and down arrows', async () => {
    render(
      <Toolbar aria-label="Tools" orientation="vertical">
        <Button>Select</Button>
        <Button>Draw</Button>
      </Toolbar>,
    );
    expect(toolbar()).toHaveAttribute('aria-orientation', 'vertical');
    await userEvent.keyboard('{Tab}{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Draw' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Select' })).toHaveFocus();
  });

  it('runs an item’s action and reports its id', async () => {
    const onAction = vi.fn();
    const onDelete = vi.fn();
    render(
      <Toolbar
        aria-label="Actions"
        onAction={onAction}
        items={[
          { id: 'copy', label: 'Copy', icon: Copy },
          { id: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', onAction: onDelete },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledExactlyOnceWith('delete');
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onAction).toHaveBeenLastCalledWith('copy');
  });

  it('names icon-only items by their label and shows toggles as pressed', async () => {
    function Formatting() {
      const [isBold, setBold] = useState(false);
      return (
        <Toolbar
          aria-label="Formatting"
          items={[
            {
              id: 'bold',
              label: 'Bold',
              icon: Bold,
              isIconOnly: true,
              isSelected: isBold,
              onAction: () => {
                setBold(!isBold);
              },
            },
            { id: 'link', label: 'Link', icon: Link, isIconOnly: true },
          ]}
        />
      );
    }
    render(<Formatting />);
    const bold = screen.getByRole('button', { name: 'Bold' });
    expect(bold).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Link' })).not.toHaveAttribute('aria-pressed');
    await userEvent.click(bold);
    expect(bold).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(bold);
    expect(bold).toHaveAttribute('aria-pressed', 'false');
  });

  it('puts a separator between groups', () => {
    render(
      <Toolbar
        aria-label="Formatting"
        items={[
          { id: 'bold', label: 'Bold', group: 'Text style' },
          { id: 'italic', label: 'Italic', group: 'Text style' },
          { id: 'left', label: 'Align left', group: 'Alignment' },
        ]}
      />,
    );
    expect(within(toolbar()).getAllByRole('separator')).toHaveLength(1);
  });

  it('keeps every item in the bar while they fit', () => {
    render(
      <Box width={400}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
      </Box>,
    );
    expect(barNames()).toEqual(['Bold', 'Italic', 'Underline', 'Link', 'Cut', 'Copy']);
    expect(moreButton()).toBeNull();
  });

  it('moves what doesn’t fit into a More actions menu, from the end', async () => {
    const onAction = vi.fn();
    render(
      <Box width={200}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} onAction={onAction} />
      </Box>,
    );
    // 200 px holds three 40 px items and the 40 px More button, with their gaps.
    expect(barNames()).toEqual(['Bold', 'Italic', 'Underline']);
    const menu = await openMore();
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Link', 'Cut', 'Copy']);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Cut' }));
    expect(onAction).toHaveBeenCalledExactlyOnceWith('cut');
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
  });

  it('moves the lowest priorities into the menu first', () => {
    const items = ICON_ITEMS.map((item) => ({
      ...item,
      priority: item.id === 'copy' || item.id === 'bold' ? 2 : item.id === 'cut' ? 1 : 0,
    }));
    render(
      <Box width={200}>
        <Toolbar aria-label="Formatting" items={items} />
      </Box>,
    );
    expect(barNames()).toEqual(['Bold', 'Cut', 'Copy']);
  });

  it('shows overflowing toggles as checked menu items', async () => {
    const onUnderline = vi.fn();
    render(
      <Box width={110}>
        <Toolbar
          aria-label="Formatting"
          items={[
            { id: 'bold', label: 'Bold', icon: Bold, isIconOnly: true, isSelected: false },
            { id: 'italic', label: 'Italic', icon: Italic, isIconOnly: true, isSelected: true },
            {
              id: 'underline',
              label: 'Underline',
              icon: Underline,
              isIconOnly: true,
              isSelected: false,
              onAction: onUnderline,
            },
          ]}
        />
      </Box>,
    );
    expect(barNames()).toEqual(['Bold']);
    const menu = await openMore();
    // Toggles with no group are a section named by the toolbar.
    expect(within(menu).getByRole('group', { name: 'Formatting' })).toBeInTheDocument();
    const italic = within(menu).getByRole('menuitemcheckbox', { name: 'Italic' });
    expect(italic).toHaveAttribute('aria-checked', 'true');
    const underline = within(menu).getByRole('menuitemcheckbox', { name: 'Underline' });
    expect(underline).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(underline);
    expect(onUnderline).toHaveBeenCalledOnce();
  });

  it('brings items back as its container grows', async () => {
    render(
      <Box width={200}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
      </Box>,
    );
    const box = screen.getByTestId('box');
    expect(moreButton()).not.toBeNull();
    box.style.width = '400px';
    await expect.poll(() => moreButton()).toBeNull();
    expect(barNames()).toHaveLength(6);
    box.style.width = '120px';
    await expect.poll(() => barNames()).toEqual(['Bold']);
  });

  it('leaves room for its other controls', () => {
    render(
      <Box width={300}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS}>
          <Button>Undo</Button>
        </Toolbar>
      </Box>,
    );
    expect(screen.getByRole('button', { name: 'Undo' })).toBeVisible();
    expect(moreButton()).not.toBeNull();
    expect(toolbar().scrollWidth).toBeLessThanOrEqual(300);
  });

  it('moves focus to More actions when the focused item moves into the menu', async () => {
    render(
      <Box width={400}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
      </Box>,
    );
    await userEvent.keyboard('{Tab}');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus();
    screen.getByTestId('box').style.width = '200px';
    await expect
      .poll(() => moreButton() !== null && document.activeElement === moreButton())
      .toBe(true);
  });

  it('moves focus to the last item when More actions goes because everything fits', async () => {
    render(
      <Box width={200}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
      </Box>,
    );
    await userEvent.keyboard('{Tab}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(moreButton()).toHaveFocus();
    screen.getByTestId('box').style.width = '400px';
    await expect.poll(() => moreButton()).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus();
  });

  it('measures again when its size changes', async () => {
    const { rerender } = render(
      <Box width={300}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
      </Box>,
    );
    // Six 40 px items fit 300 px; six 48 px items don't.
    expect(moreButton()).toBeNull();
    rerender(
      <Box width={300}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} size="lg" />
      </Box>,
    );
    await expect.poll(() => moreButton()).not.toBeNull();
    expect(toolbar().scrollWidth).toBeLessThanOrEqual(300);
  });

  it('measures again when an item resizes by itself, such as when a web font loads', async () => {
    render(
      <Box width={300}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
      </Box>,
    );
    expect(moreButton()).toBeNull();
    const style = document.createElement('style');
    style.textContent = '[data-toolbar-item] button { width: 64px; }';
    document.head.append(style);
    try {
      await expect.poll(() => moreButton()).not.toBeNull();
      expect(toolbar().scrollWidth).toBeLessThanOrEqual(300);
    } finally {
      style.remove();
    }
  });

  it('measures layout sizes, so a scale transform (an overlay opening) doesn’t change what fits', async () => {
    render(
      <div style={{ transform: 'scale(0.5)', transformOrigin: '0 0' }}>
        <Box width={200}>
          <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
        </Box>
      </div>,
    );
    expect(barNames()).toEqual(['Bold', 'Italic', 'Underline']);
    // Measured again while scaled, the items still don't fit 199 px.
    screen.getByTestId('box').style.width = '199px';
    await frames(3);
    expect(barNames()).toEqual(['Bold', 'Italic', 'Underline']);
  });

  it('doesn’t read the items’ layout again for an equal new items array', () => {
    const { rerender } = render(
      <Box width={200}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} />
      </Box>,
    );
    const read = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const offset = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get');
    try {
      rerender(
        <Box width={200}>
          <Toolbar aria-label="Formatting" items={ICON_ITEMS.map((item) => ({ ...item }))} />
        </Box>,
      );
      const itemReads = [...read.mock.contexts, ...offset.mock.contexts].filter(
        (element) => element instanceof HTMLElement && element.hasAttribute('data-toolbar-item'),
      );
      expect(itemReads).toHaveLength(0);
    } finally {
      read.mockRestore();
      offset.mockRestore();
    }
  });

  it('names the overflow menu’s toggle sections by their group', async () => {
    render(
      <Box width={110}>
        <Toolbar
          aria-label="Formatting"
          items={[
            { id: 'undo', label: 'Undo', icon: Copy, isIconOnly: true },
            {
              id: 'bold',
              label: 'Bold',
              icon: Bold,
              isIconOnly: true,
              isSelected: true,
              group: 'Text style',
            },
            {
              id: 'italic',
              label: 'Italic',
              icon: Italic,
              isIconOnly: true,
              isSelected: false,
              group: 'Text style',
            },
          ]}
        />
      </Box>,
    );
    const menu = await openMore();
    const section = within(menu).getByRole('group', { name: 'Text style' });
    expect(within(section).getAllByRole('menuitemcheckbox')).toHaveLength(2);
  });

  it('works with toggle button groups among its controls', async () => {
    const { container } = render(
      <Toolbar aria-label="Formatting">
        <ToggleButtonGroup aria-label="Style" selectionMode="multiple">
          <ToggleButton id="bold" icon={Bold} isIconOnly>
            Bold
          </ToggleButton>
          <ToggleButton id="italic" icon={Italic} isIconOnly>
            Italic
          </ToggleButton>
        </ToggleButtonGroup>
        <Separator orientation="vertical" />
        <ToggleButtonGroup aria-label="Alignment" defaultSelectedKeys={['left']}>
          <ToggleButton id="left" icon={AlignLeft} isIconOnly>
            Align left
          </ToggleButton>
          <ToggleButton id="center" icon={AlignCenter} isIconOnly>
            Align centre
          </ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>,
    );
    // Inside a toolbar the groups are plain groups; the toolbar handles the arrow keys.
    expect(screen.getByRole('group', { name: 'Style' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Alignment' })).toBeInTheDocument();
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Align left' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByRole('radio', { name: 'Align centre' })).toBeChecked();
    await expectNoAxeViolations(container);
  });

  it.runIf(hasTouch)('runs items and opens the menu on tap', async () => {
    const onAction = vi.fn();
    render(
      <Box width={200}>
        <Toolbar aria-label="Formatting" items={ICON_ITEMS} onAction={onAction} />
      </Box>,
    );
    await commands.tap('button[aria-label="Italic"]');
    expect(onAction).toHaveBeenCalledWith('italic');
    await commands.tap('button[aria-label="More actions"]');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider messages={{ moreActions: 'Plus d’actions' }}>
        <Box width={200}>
          <Toolbar aria-label="Mise en forme" items={ICON_ITEMS} />
        </Box>
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Plus d’actions' })).toBeInTheDocument();
  });

  it('never makes the page scroll sideways on a narrow screen', () => {
    render(
      <Toolbar
        aria-label="Formatting"
        items={[...ICON_ITEMS, ...ICON_ITEMS.map((item) => ({ ...item, id: `${item.id}-2` }))]}
      />,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('passes className, ref and data attributes to the root, and has no axe violations', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Box width={200}>
        <Toolbar
          ref={ref}
          aria-label="Formatting"
          className="justify-end"
          data-testid="formatting"
          items={ICON_ITEMS}
        />
      </Box>,
    );
    expect(ref.current).toBe(toolbar());
    expect(toolbar()).toHaveClass('justify-end');
    // The items line up the same way.
    const items = toolbar().querySelector('[data-toolbar-item]')?.parentElement;
    expect(items && getComputedStyle(items).justifyContent).toBe('flex-end');
    expect(screen.getByTestId('formatting')).toBe(toolbar());
    await expectNoAxeViolations(container);
  });
});
