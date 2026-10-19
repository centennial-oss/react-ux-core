import { fireEvent, render, screen, within } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { PopoverTrigger, Popover } from '../Popover';
import { HoverCard, type HoverCardProps } from './HoverCard';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
// The tablet and phone instances have a touch screen.
const hasTouch = 'ontouchstart' in window;

function Example(props: Partial<HoverCardProps>) {
  return (
    <div className="flex flex-col items-start gap-16 p-4">
      <p>Elsewhere</p>
      <NameCard {...props} />
    </div>
  );
}

function NameCard(props: Partial<HoverCardProps>) {
  return (
    <HoverCard
      aria-label="Ada Lovelace"
      delay={100}
      closeDelay={50}
      content={
        <div>
          <p>Lead analyst</p>
          <Button>Message</Button>
        </div>
      }
      {...props}
    >
      <Button href="#ada" variant="link">
        Ada Lovelace
      </Button>
    </HoverCard>
  );
}

const trigger = () => screen.getByRole('link', { name: 'Ada Lovelace' });
const card = () => screen.findByRole('dialog', { name: 'Ada Lovelace' });

/** Moves the pointer off every trigger. */
const leave = () => userEvent.hover(screen.getByText('Elsewhere'));

/**
 * Hovers `element` from elsewhere: React Aria starts a hover on pointerenter, and only once it has seen the pointer
 * move (a test's first hover), so the pointer mustn't already be over where the element renders.
 */
async function hover(element: Element) {
  await leave();
  await userEvent.hover(element);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * A touch long press: React Aria opens the preview once the finger has been down for 500 ms. It then ignores mouse
 * hovers for 500 ms (iOS sends one after a touch), so this waits that out for the tests after it.
 */
async function longPress(element: Element) {
  const pointer = {
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    width: 20,
    height: 20,
  };
  const { left, top } = element.getBoundingClientRect();
  const at = { clientX: left + 4, clientY: top + 4 };
  fireEvent.pointerDown(element, { ...pointer, ...at, pressure: 0.5 });
  await wait(700);
  fireEvent.pointerUp(element, { ...pointer, ...at, pressure: 0 });
  await wait(600);
}

/**
 * Whether a bottom-placed popover's arrow is painted where it sits, just above the popover (an overflow that scrolls
 * the popover's content would clip it). The arrow points up, so its lower half is filled.
 */
function isArrowShown(popover: Element) {
  const arrow = popover.querySelector('svg');
  if (!arrow) {
    return false;
  }
  const { left, top, width, height } = arrow.getBoundingClientRect();
  return arrow.contains(document.elementFromPoint(left + width / 2, top + height * 0.75));
}

afterEach(() => {
  // The link tests navigate to #ada.
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
});

describe('HoverCard', () => {
  it.runIf(!isPhone)(
    'opens on hover after its delay and closes once the pointer leaves',
    async () => {
      render(<Example delay={300} />);
      await hover(trigger());
      await wait(100);
      expect(screen.queryByRole('dialog')).toBeNull();
      const dialog = await card();
      expect(within(dialog).getByText('Lead analyst')).toBeVisible();
      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      await leave();
      await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    },
  );

  it.runIf(!isPhone)(
    'stays open while the pointer moves onto the card, whose buttons work',
    async () => {
      const onPress = vi.fn();
      render(
        <Example
          content={
            <div>
              <p>Lead analyst</p>
              <Button onPress={onPress}>Message</Button>
            </div>
          }
        />,
      );
      await hover(trigger());
      const dialog = await card();
      const message = within(dialog).getByRole('button', { name: 'Message' });
      await userEvent.hover(message);
      // Longer than closeDelay: moving from the trigger onto the card doesn't close it.
      await wait(300);
      expect(screen.getByRole('dialog', { name: 'Ada Lovelace' })).toBe(dialog);
      await userEvent.click(message);
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it.runIf(!isPhone)(
    'opens on keyboard focus, Tab moves into the card, and Escape closes it',
    async () => {
      render(<Example />);
      await userEvent.tab();
      expect(document.activeElement).toBe(trigger());
      const dialog = await card();
      // Focus stays on the trigger until the user tabs in.
      expect(document.activeElement).toBe(trigger());
      await userEvent.tab();
      expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Message' }));
      await userEvent.keyboard('{Escape}');
      await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
      await expect.poll(() => document.activeElement).toBe(trigger());
      // Focus coming back doesn't reopen it.
      await wait(300);
      expect(screen.queryByRole('dialog')).toBeNull();
    },
  );

  it.runIf(!isPhone)('closes with Escape from the trigger', async () => {
    render(<Example />);
    await userEvent.tab();
    await card();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('keeps the trigger’s own action: a link still navigates when pressed', async () => {
    render(<Example />);
    await userEvent.click(trigger());
    expect(window.location.hash).toBe('#ada');
  });

  it('keeps a button trigger’s press', async () => {
    const onPress = vi.fn();
    render(
      <HoverCard aria-label="Shortcuts" content={<p>Ctrl+K</p>}>
        <Button onPress={onPress}>Search</Button>
      </HoverCard>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.runIf(hasTouch)('opens with a long press on a touch screen', async () => {
    render(<Example />);
    await longPress(trigger());
    const dialog = await card();
    if (isPhone) {
      expect(dialog.closest('[data-position="bottom"]')).not.toBeNull();
    } else {
      expect(dialog.closest('[data-placement]')).not.toBeNull();
    }
  });

  it.runIf(isPhone)('is a bottom sheet on phones that stays open until dismissed', async () => {
    render(<Example />);
    await longPress(trigger());
    const dialog = await card();
    expect(dialog.closest('[data-position="bottom"]')).not.toBeNull();
    // The trigger names the sheet as the card it controls.
    expect(trigger()).toHaveAttribute('aria-controls', dialog.id);
    // The sheet takes focus from the trigger; that alone doesn't close it.
    await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
    await wait(400);
    expect(screen.getByRole('dialog', { name: 'Ada Lovelace' })).toBe(dialog);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it.runIf(!isPhone)('is anchored to its trigger with an arrow on tablet and desktop', async () => {
    render(<Example hasArrow defaultOpen />);
    const dialog = await card();
    expect(dialog.closest('[data-position]')).toBeNull();
    expect(dialog).toHaveAttribute('data-placement', 'bottom');
    await expect.poll(() => isArrowShown(dialog)).toBe(true);
    expect(dialog.getBoundingClientRect().top).toBeGreaterThan(
      trigger().getBoundingClientRect().bottom,
    );
    // The popover is the dialog itself, with the id the trigger's aria-controls names.
    expect(dialog.querySelector('[role="dialog"]')).toBeNull();
    expect(trigger()).toHaveAttribute('aria-controls', dialog.id);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('can be an anchored popover on phones too', async () => {
    render(<Example defaultOpen hasPhoneSheet={false} />);
    const dialog = await card();
    expect(dialog.closest('[data-position]')).toBeNull();
    expect(dialog.closest('[data-placement]')).not.toBeNull();
  });

  it('is controlled with isOpen and onOpenChange', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example isOpen={false} onOpenChange={onOpenChange} delay={0} />);
    await hover(trigger());
    await expect.poll(() => onOpenChange.mock.calls).toEqual([[true]]);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Example isOpen onOpenChange={onOpenChange} delay={0} />);
    expect(await card()).toBeVisible();
  });

  it('opens uncontrolled with defaultOpen', async () => {
    render(<Example defaultOpen />);
    expect(await card()).toBeVisible();
  });

  it('never opens while disabled, and the link still works', async () => {
    const onOpenChange = vi.fn();
    render(<Example isDisabled onOpenChange={onOpenChange} delay={0} />);
    await hover(trigger());
    await wait(200);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    await userEvent.click(trigger());
    expect(window.location.hash).toBe('#ada');
  });

  it('leaves the Popover it shares a surface with working, its arrow shown', async () => {
    render(
      <PopoverTrigger>
        <Button>Filters</Button>
        <Popover aria-label="Filter options" hasArrow>
          <Button>Apply</Button>
        </Popover>
      </PopoverTrigger>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filter options' });
    // Popover still nests a Dialog in its surface (on phones, the sheet is the dialog).
    expect(dialog.closest('[data-placement], [data-position="bottom"]')).not.toBeNull();
    if (!isPhone) {
      const popover = dialog.closest('[data-placement]');
      await expect.poll(() => popover !== null && isArrowShown(popover)).toBe(true);
    }
  });

  it('has no accessibility violations when open, and the page never scrolls sideways', async () => {
    const { container } = render(<Example defaultOpen hasArrow />);
    const dialog = await card();
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(dialog);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('stops rendering once it is open', async () => {
    let commits = 0;
    render(
      <Profiler
        id="hover-card"
        onRender={() => {
          commits += 1;
        }}
      >
        <Example defaultOpen hasArrow />
      </Profiler>,
    );
    await card();
    const settled = async () => {
      const before = commits;
      await wait(300);
      return commits - before;
    };
    await expect.poll(settled, { timeout: 5000 }).toBe(0);
  });
});
