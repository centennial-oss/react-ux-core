import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { DialogTrigger } from '../Dialog';
import { Drawer } from './Drawer';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function Example() {
  return (
    <DialogTrigger>
      <Button>Filters</Button>
      <Drawer
        title="Filters"
        description="Narrow the customer list."
        footer={
          <Button slot="close" tone="accent">
            Apply
          </Button>
        }
      >
        <p>Filter fields</p>
      </Drawer>
    </DialogTrigger>
  );
}

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
  const dialog = await screen.findByRole('dialog', { name: 'Filters' });
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return dialog;
}

async function expectClosed() {
  await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
}

describe('Drawer', () => {
  it('is a dialog labelled by its title and described by its description', async () => {
    render(<Example />);
    const dialog = await open();
    expect(dialog).toHaveAccessibleDescription('Narrow the customer list.');
  });

  it.runIf(!isPhone)('slides in from the end edge on tablet and desktop', async () => {
    render(<Example />);
    const dialog = await open();
    // React Aria resolves the logical `end` edge to the physical side (right, in left-to-right layouts).
    expect(dialog.closest('[data-position]')?.getAttribute('data-position')).toMatch(
      /^(end|right)$/,
    );
    await expect
      .poll(() => Math.round(dialog.getBoundingClientRect().right), { timeout: 2000 })
      .toBe(window.innerWidth);
  });

  it.runIf(isPhone)('is a bottom sheet on phones', async () => {
    render(<Example />);
    const dialog = await open();
    expect(dialog.closest('[data-position="bottom"]')).not.toBeNull();
  });

  it('closes from the close button, a slot="close" button, and Escape (returning focus)', async () => {
    render(<Example />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expectClosed();
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await expectClosed();
    await open();
    await userEvent.keyboard('{Escape}');
    await expectClosed();
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('button', { name: 'Filters' }));
  });

  it('has no accessibility violations', async () => {
    render(<Example />);
    await expectNoAxeViolations(await open());
  });
});
