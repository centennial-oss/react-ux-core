import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { Popover, PopoverTrigger } from './Popover';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function Example() {
  return (
    <PopoverTrigger>
      <Button>Filters</Button>
      <Popover aria-label="Filter options" hasArrow>
        <Button>Apply</Button>
      </Popover>
    </PopoverTrigger>
  );
}

describe('Popover', () => {
  it('opens a labelled dialog from its trigger and moves focus into it', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filter options' });
    // Sheets animate in on phones, so focus can arrive a moment later.
    await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  });

  it.runIf(isPhone)('is a bottom sheet on phones', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filter options' });
    expect(dialog.closest('[data-position="bottom"]')).not.toBeNull();
  });

  it.runIf(!isPhone)('is anchored to its trigger on tablet and desktop', async () => {
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Filters' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Filter options' });
    expect(dialog.closest('[data-position]')).toBeNull();
    expect(dialog.closest('[data-placement]')).not.toBeNull();
    expect(dialog.getBoundingClientRect().top).toBeGreaterThan(
      trigger.getBoundingClientRect().bottom,
    );
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Filters' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Filter options' });
    await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    await expect.poll(() => document.activeElement).toBe(trigger);
  });

  it('has no accessibility violations when open', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await expectNoAxeViolations(await screen.findByRole('dialog', { name: 'Filter options' }));
  });
});
