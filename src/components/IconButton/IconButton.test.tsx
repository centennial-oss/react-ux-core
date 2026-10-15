import { render, screen } from '@testing-library/react';
import { Bold, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { IconButton } from './IconButton';

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('IconButton', () => {
  it('is a button named by its aria-label, with the icon hidden', async () => {
    const onPress = vi.fn();
    render(<IconButton icon={Plus} aria-label="Add row" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Add row' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  describe('toggle', () => {
    it('has toggle-button semantics (aria-pressed) when uncontrolled', async () => {
      const onChange = vi.fn();
      render(
        <IconButton icon={Bold} aria-label="Bold" defaultSelected={false} onChange={onChange} />,
      );
      const button = screen.getByRole('button', { name: 'Bold' });
      expect(button).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(button);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('follows isSelected when controlled', async () => {
      function Controlled() {
        const [isSelected, setSelected] = useState(true);
        return (
          <IconButton
            icon={Bold}
            aria-label="Bold"
            isSelected={isSelected}
            onChange={setSelected}
          />
        );
      }
      render(<Controlled />);
      const button = screen.getByRole('button', { name: 'Bold' });
      expect(button).toHaveAttribute('aria-pressed', 'true');
      await userEvent.keyboard('{Tab}{Enter}');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('press-and-hold repeat', () => {
    it('fires immediately, repeats while a key is held, and stops on release', async () => {
      const onRepeat = vi.fn();
      render(
        <IconButton
          icon={Plus}
          aria-label="Increase"
          onRepeat={onRepeat}
          repeatDelay={60}
          repeatInterval={20}
        />,
      );
      await userEvent.keyboard('{Tab}');
      await userEvent.keyboard('{Enter>}');
      expect(onRepeat).toHaveBeenCalledTimes(1);
      await wait(250);
      await userEvent.keyboard('{/Enter}');
      const calls = onRepeat.mock.calls.length;
      expect(calls).toBeGreaterThanOrEqual(4);
      await wait(120);
      expect(onRepeat).toHaveBeenCalledTimes(calls);
    });

    it('repeats while the mouse is held down', async () => {
      const onRepeat = vi.fn();
      render(
        <IconButton
          icon={Minus}
          aria-label="Decrease"
          data-testid="hold-target"
          onRepeat={onRepeat}
          repeatDelay={60}
          repeatInterval={20}
        />,
      );
      await commands.hold('[data-testid="hold-target"]', 250);
      const calls = onRepeat.mock.calls.length;
      expect(calls).toBeGreaterThanOrEqual(4);
      await wait(120);
      expect(onRepeat).toHaveBeenCalledTimes(calls);
    });

    it('stops when the component unmounts mid-press', async () => {
      const onRepeat = vi.fn();
      const { unmount } = render(
        <IconButton
          icon={Plus}
          aria-label="Increase"
          onRepeat={onRepeat}
          repeatDelay={30}
          repeatInterval={20}
        />,
      );
      await userEvent.keyboard('{Tab}{Enter>}');
      await wait(80);
      unmount();
      const calls = onRepeat.mock.calls.length;
      await wait(120);
      expect(onRepeat).toHaveBeenCalledTimes(calls);
      await userEvent.keyboard('{/Enter}');
    });

    it("doesn't repeat when disabled", async () => {
      const onRepeat = vi.fn();
      render(<IconButton icon={Plus} aria-label="Increase" onRepeat={onRepeat} isDisabled />);
      await userEvent.click(screen.getByRole('button', { name: 'Increase' }), { force: true });
      expect(onRepeat).not.toHaveBeenCalled();
    });
  });

  it('shows a spinner and aria-busy while pending', () => {
    render(<IconButton icon={Plus} aria-label="Add row" isPending />);
    const button = screen.getByRole('button', { name: 'Add row' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <IconButton icon={Plus} aria-label="Add" />
        <IconButton icon={Plus} aria-label="Add" variant="solid" tone="accent" />
        <IconButton icon={Bold} aria-label="Bold" defaultSelected />
        <IconButton icon={Plus} aria-label="Add" isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
