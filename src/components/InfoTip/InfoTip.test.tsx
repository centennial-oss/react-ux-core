import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { InfoTip } from './InfoTip';

const hasTouch = navigator.maxTouchPoints > 0;

async function expectOpen(name: string) {
  const dialog = await screen.findByRole('dialog', { name });
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return dialog;
}

describe('InfoTip', () => {
  it('opens its explanation from a labelled button and closes with Escape', async () => {
    render(<InfoTip title="Billing period">The dates a bill covers.</InfoTip>);
    await userEvent.click(screen.getByRole('button', { name: 'More information' }));
    const dialog = await expectOpen('More information');
    expect(dialog.textContent).toContain('The dates a bill covers.');
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it('opens from the keyboard and uses a custom label', async () => {
    render(<InfoTip aria-label="About billing periods">The dates a bill covers.</InfoTip>);
    await userEvent.keyboard('{Tab}{Enter}');
    await expectOpen('About billing periods');
  });

  it.runIf(hasTouch)('opens with a touch tap', async () => {
    render(
      <span data-testid="info">
        <InfoTip>The dates a bill covers.</InfoTip>
      </span>,
    );
    await commands.tap('[data-testid="info"] button');
    await expectOpen('More information');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <p>
        Billing period <InfoTip>The dates a bill covers.</InfoTip>
      </p>,
    );
    await expectNoAxeViolations(container);
  });
});
