import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Menu, MenuItem } from '../Menu/Menu';
import { ContextMenuTrigger, type ContextMenuTriggerProps } from './ContextMenu';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function Area({
  onAction = vi.fn(),
  ...props
}: Partial<Omit<ContextMenuTriggerProps, 'children'>> & { onAction?: (key: unknown) => void }) {
  return (
    <ContextMenuTrigger {...props}>
      <div role="group" aria-label="Report" tabIndex={-1} style={{ width: 300, height: 120 }}>
        <input aria-label="Notes" />
      </div>
      <Menu aria-label="Report actions" onAction={onAction}>
        <MenuItem id="edit">Edit</MenuItem>
        <MenuItem id="delete">Delete</MenuItem>
      </Menu>
    </ContextMenuTrigger>
  );
}

async function waitForMenu() {
  const menu = await screen.findByRole('menu');
  await expect.poll(() => menu.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return menu;
}

describe('ContextMenuTrigger', () => {
  it('opens its menu on right-click, runs the chosen action and closes', async () => {
    const onAction = vi.fn();
    render(<Area onAction={onAction} />);
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(screen.getByRole('group', { name: 'Report' }), {
      button: 'right',
      position: { x: 200, y: 90 },
    });
    const menu = await waitForMenu();
    expect(menu).toHaveAccessibleName('Report actions');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    expect(onAction.mock.calls[0]?.[0]).toBe('delete');
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
  });

  // Phones show menus as bottom sheets, so there's no point to open at.
  it.skipIf(isPhone)('opens at the pointer, even inside a transformed container', async () => {
    render(
      // A transform makes `position: fixed` relative to the container (as in Storybook's docs, or an animation).
      <div style={{ transform: 'translateX(0)', marginInlineStart: 120, marginTop: 60 }}>
        <Area />
      </div>,
    );
    const area = screen.getByRole('group', { name: 'Report' });
    await userEvent.click(area, { button: 'right', position: { x: 40, y: 30 } });
    const menu = await waitForMenu();
    // Measure once the menu has finished scaling in.
    await expect
      .poll(() => document.querySelector('[data-entering]'), { timeout: 2000 })
      .toBeNull();
    const rect = area.getBoundingClientRect();
    const popover = (menu.closest('[data-trigger]') ?? menu).getBoundingClientRect();
    expect(Math.abs(popover.left - (rect.left + 40))).toBeLessThan(2);
    expect(Math.abs(popover.top - (rect.top + 30))).toBeLessThan(2);
  });

  it('opens with Shift+F10 from inside the area and returns focus on Escape', async () => {
    render(<Area />);
    const area = screen.getByRole('group', { name: 'Report' });
    area.focus();
    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    await waitForMenu();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
    await expect.poll(() => document.activeElement).toBe(area);
  });

  it('leaves the browser menu in text fields, and everywhere when disabled', () => {
    const { rerender } = render(<Area />);
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5 });
    screen.getByRole('textbox', { name: 'Notes' }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole('menu')).toBeNull();

    rerender(<Area isDisabled />);
    const disabled = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5 });
    screen.getByRole('group', { name: 'Report' }).dispatchEvent(disabled);
    expect(disabled.defaultPrevented).toBe(false);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('can be controlled', async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [isOpen, setOpen] = useState(true);
      return (
        <Area
          isOpen={isOpen}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        />
      );
    }
    render(<Controlled />);
    await waitForMenu();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('has no axe violations while open', async () => {
    const { container } = render(<Area isOpen />);
    const menu = await waitForMenu();
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(menu);
  });
});
