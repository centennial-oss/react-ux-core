import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { ButtonGroup } from '../ButtonGroup';
import { Dialog, DialogTrigger, type DialogProps } from './Dialog';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function Example(props: Partial<DialogProps>) {
  return (
    <>
      <Button>Outside</Button>
      <DialogTrigger>
        <Button>Edit customer</Button>
        <Dialog
          title="Edit customer"
          description="Changes apply immediately."
          footer={
            <ButtonGroup>
              <Button slot="close" variant="outline">
                Cancel
              </Button>
              <Button tone="accent">Save</Button>
            </ButtonGroup>
          }
          {...props}
        >
          <p>Body content</p>
        </Dialog>
      </DialogTrigger>
    </>
  );
}

async function open(name = 'Edit customer') {
  await userEvent.click(screen.getByRole('button', { name }));
  const dialog = await screen.findByRole('dialog');
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return dialog;
}

async function expectClosed() {
  await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
}

describe('Dialog', () => {
  it('is a modal dialog labelled by its title and described by its description', async () => {
    render(<Example />);
    const dialog = await open();
    expect(dialog).toHaveAccessibleName('Edit customer');
    expect(dialog).toHaveAccessibleDescription('Changes apply immediately.');
  });

  it('hides the page behind it from assistive technology and locks page scrolling', async () => {
    render(<Example />);
    await open();
    expect(
      screen
        .getByRole('button', { name: 'Outside', hidden: true })
        .closest('[aria-hidden="true"], [inert]'),
    ).not.toBeNull();
    expect(getComputedStyle(document.documentElement).overflow).toBe('hidden');
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const onOpenChange = vi.fn();
    render(
      <DialogTrigger onOpenChange={onOpenChange}>
        <Button>Open</Button>
        <Dialog title="Details">Body</Dialog>
      </DialogTrigger>,
    );
    await open('Open');
    await userEvent.keyboard('{Escape}');
    await expectClosed();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('button', { name: 'Open' }));
  });

  it('closes from the header close button and from a slot="close" footer button', async () => {
    render(<Example />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await expectClosed();
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expectClosed();
  });

  // Phones show a full-screen dialog, so there's no backdrop to click there.
  it.runIf(!isPhone)('closes when the backdrop is clicked', async () => {
    render(<Example size="sm" />);
    await open();
    await page.elementLocator(document.body).click({ position: { x: 4, y: 4 } });
    await expectClosed();
  });

  it("can't be dismissed with Escape when isDismissable is false, and has no close button", async () => {
    render(<Example isDismissable={false} />);
    await open();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it("can't be dismissed while busy, and reports aria-busy", async () => {
    render(<Example isBusy />);
    const dialog = await open();
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('passes close to function children', async () => {
    render(
      <DialogTrigger>
        <Button>Open</Button>
        <Dialog title="Pick">{(close) => <Button onPress={close}>Choose and close</Button>}</Dialog>
      </DialogTrigger>,
    );
    await open('Open');
    await userEvent.click(screen.getByRole('button', { name: 'Choose and close' }));
    await expectClosed();
  });

  it('closes only the top dialog of a stack with Escape', async () => {
    render(
      <DialogTrigger>
        <Button>Open first</Button>
        <Dialog title="First">
          <DialogTrigger>
            <Button>Open second</Button>
            <Dialog title="Second">Second body</Dialog>
          </DialogTrigger>
        </Dialog>
      </DialogTrigger>,
    );
    await open('Open first');
    await userEvent.click(screen.getByRole('button', { name: 'Open second' }));
    await screen.findByRole('dialog', { name: 'Second' });
    await userEvent.keyboard('{Escape}');
    await expect
      .poll(() => screen.queryByRole('dialog', { name: 'Second' }), { timeout: 3000 })
      .toBeNull();
    expect(screen.getByRole('dialog', { name: 'First' })).toBeInTheDocument();
  });

  it('works controlled, without a trigger', async () => {
    function Controlled() {
      const [isOpen, setOpen] = useState(true);
      return (
        <>
          <span>{isOpen ? 'open' : 'closed'}</span>
          <Dialog title="Controlled" isOpen={isOpen} onOpenChange={setOpen}>
            Body
          </Dialog>
        </>
      );
    }
    render(<Controlled />);
    await screen.findByRole('dialog', { name: 'Controlled' });
    await userEvent.keyboard('{Escape}');
    await expectClosed();
    expect(screen.getByText('closed')).toBeInTheDocument();
  });

  it.runIf(isPhone)('fills the screen on phones', async () => {
    render(<Example />);
    const dialog = await open();
    // Measured once the opening animation (a slight scale) has finished.
    await expect.poll(() => dialog.getBoundingClientRect().width).toBe(window.innerWidth);
    expect(dialog.getBoundingClientRect().height).toBeGreaterThan(window.innerHeight * 0.9);
  });

  it.runIf(!isPhone)('is centred at its size on tablet and desktop', async () => {
    render(<Example size="sm" />);
    const dialog = await open();
    const rect = dialog.getBoundingClientRect();
    expect(rect.width).toBeLessThanOrEqual(384);
    expect(Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2)).toBeLessThan(2);
  });

  it('has no accessibility violations', async () => {
    render(<Example />);
    await expectNoAxeViolations(await open());
  });
});
