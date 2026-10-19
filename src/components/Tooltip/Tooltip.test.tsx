import { render, screen } from '@testing-library/react';
import { Settings } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { IconButton } from '../IconButton';
import { Tooltip } from './Tooltip';

const hasTouch = navigator.maxTouchPoints > 0;

describe('Tooltip', () => {
  it.runIf(!hasTouch)('shows on hover and describes its trigger', async () => {
    render(
      <Tooltip content="Workspace settings" delay={0}>
        <IconButton icon={Settings} aria-label="Settings" />
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Settings' });
    // React Aria misses the very first hover in a fresh page (no prior pointer movement), so move the pointer first.
    await userEvent.hover(document.body);
    await userEvent.hover(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('Workspace settings');
    expect(trigger).toHaveAccessibleDescription('Workspace settings');
  });

  it('shows on keyboard focus and hides with Escape', async () => {
    render(
      <Tooltip content="Workspace settings">
        <IconButton icon={Settings} aria-label="Settings" />
      </Tooltip>,
    );
    await userEvent.keyboard('{Tab}');
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('tooltip')).toBeNull();
  });

  it.runIf(hasTouch)(
    'shows briefly after a touch tap, and the tap still activates the button',
    async () => {
      const onPress = vi.fn();
      render(
        <Tooltip content="Workspace settings">
          <IconButton
            icon={Settings}
            aria-label="Settings"
            data-testid="tooltip-trigger"
            onPress={onPress}
          />
        </Tooltip>,
      );
      await commands.tap('[data-testid="tooltip-trigger"]');
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      await expect.poll(() => screen.queryByRole('tooltip'), { timeout: 3000 }).toBeNull();
    },
  );

  it("doesn't show when disabled", async () => {
    render(
      <Tooltip content="Workspace settings" isDisabled>
        <IconButton icon={Settings} aria-label="Settings" />
      </Tooltip>,
    );
    await userEvent.keyboard('{Tab}');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('has no accessibility violations when shown', async () => {
    const { container } = render(
      <Tooltip content="Workspace settings">
        <IconButton icon={Settings} aria-label="Settings" />
      </Tooltip>,
    );
    await userEvent.keyboard('{Tab}');
    await screen.findByRole('tooltip');
    await expectNoAxeViolations(container);
  });
});
