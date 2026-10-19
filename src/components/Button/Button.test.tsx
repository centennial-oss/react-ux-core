import { render, screen } from '@testing-library/react';
import { Save } from 'lucide-react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import type { LinkComponentProps } from '../../provider/link';
import { Button } from './Button';

const hasTouch = navigator.maxTouchPoints > 0;

describe('Button', () => {
  it('renders a button with its label', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('calls onPress when clicked', async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is keyboard operable with Enter and Space, with a visible focus ring', async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });

    await userEvent.keyboard('{Tab}');
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('data-focus-visible', 'true');

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it.runIf(hasTouch)('calls onPress when tapped', async () => {
    const onPress = vi.fn();
    render(
      <Button data-testid="tap-target" onPress={onPress}>
        Save
      </Button>,
    );
    await commands.tap('[data-testid="tap-target"]');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.runIf(hasTouch)('has a touch target of at least --hit-size, even when small', () => {
    render(<Button size="sm">Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    const hitSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--hit-size'),
    );
    const before = getComputedStyle(button, '::before');
    const rect = button.getBoundingClientRect();
    const hitHeight = rect.height - parseFloat(before.top) - parseFloat(before.bottom);

    expect(hitSize).toBe(44);
    expect(rect.height).toBeLessThan(hitSize);
    expect(hitHeight).toBeGreaterThanOrEqual(hitSize);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = vi.fn();
    render(
      <Button isDisabled onPress={onPress}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    await userEvent.click(button, { force: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  describe('isPending', () => {
    it('sets aria-busy, blocks presses and keeps its accessible name', async () => {
      const onPress = vi.fn();
      render(
        <Button isPending onPress={onPress}>
          Save
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      // force: Playwright won't click an aria-disabled element; React Aria must block the press itself.
      await userEvent.click(button, { force: true });
      expect(onPress).not.toHaveBeenCalled();
    });

    it('stays focusable', async () => {
      render(<Button isPending>Save</Button>);
      await userEvent.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    });

    it("shows a spinner and keeps the button's width", () => {
      const { rerender, container } = render(<Button icon={Save}>Save changes</Button>);
      const button = screen.getByRole('button', { name: 'Save changes' });
      const idleWidth = button.getBoundingClientRect().width;
      expect(container.querySelector('svg.animate-spin')).toBeNull();

      rerender(
        <Button icon={Save} isPending>
          Save changes
        </Button>,
      );
      expect(button.getBoundingClientRect().width).toBe(idleWidth);
      expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
    });
  });

  describe('href', () => {
    it('renders a link (a plain anchor by default)', () => {
      render(<Button href="/settings">Settings</Button>);
      const link = screen.getByRole('link', { name: 'Settings' });
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/settings');
    });

    it("renders through UIProvider's LinkComponent", () => {
      const AppLink = vi.fn(({ children, ...props }: LinkComponentProps) => (
        <a data-app-link="true" {...props}>
          {children}
        </a>
      ));
      render(
        <UIProvider LinkComponent={AppLink}>
          <Button href="/settings" tone="accent">
            Settings
          </Button>
        </UIProvider>,
      );
      const link = screen.getByRole('link', { name: 'Settings' });
      expect(link).toHaveAttribute('data-app-link', 'true');
      expect(link).toHaveAttribute('href', '/settings');
      expect(link.className).toContain('bg-accent-solid');
      expect(AppLink).toHaveBeenCalled();
    });

    it('is keyboard operable', async () => {
      const onPress = vi.fn();
      render(
        <Button href="#target" onPress={onPress}>
          Go
        </Button>,
      );
      await userEvent.keyboard('{Tab}');
      expect(screen.getByRole('link', { name: 'Go' })).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the icon before or after the label, hidden from assistive technology', () => {
    const { rerender } = render(<Button icon={Save}>Save</Button>);
    let button = screen.getByRole('button', { name: 'Save' });
    let icon = button.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.nextSibling?.textContent).toBe('Save');

    rerender(
      <Button icon={Save} iconPosition="end">
        Save
      </Button>,
    );
    button = screen.getByRole('button', { name: 'Save' });
    icon = button.querySelector('svg');
    expect(icon?.previousSibling?.textContent).toBe('Save');
  });

  it('forwards its ref to the root element', () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const linkRef = createRef<HTMLAnchorElement>();
    render(
      <>
        <Button ref={buttonRef}>Save</Button>
        <Button ref={linkRef} href="/home">
          Home
        </Button>
      </>,
    );
    expect(buttonRef.current).toBe(screen.getByRole('button', { name: 'Save' }));
    expect(linkRef.current).toBe(screen.getByRole('link', { name: 'Home' }));
  });

  it('passes through data-* and aria-* attributes', () => {
    render(
      <>
        <p id="hint">Saves the draft</p>
        <Button
          data-testid="save"
          aria-describedby="hint"
          aria-controls="panel"
          aria-expanded={false}
        >
          Save
        </Button>
      </>,
    );
    const button = screen.getByTestId('save');
    expect(button).toHaveAccessibleDescription('Saves the draft');
    expect(button).toHaveAttribute('aria-controls', 'panel');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('lets className override its own classes', () => {
    render(<Button className="rounded-none px-8">Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.className).toContain('rounded-none');
    expect(button.className).not.toContain('rounded-control');
    expect(button.className).toContain('px-8');
    expect(button.className).not.toContain('px-4');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Button>Neutral</Button>
        <Button variant="soft" tone="accent" icon={Save}>
          Accent
        </Button>
        <Button variant="outline" tone="danger" isDisabled>
          Disabled
        </Button>
        <Button isPending>Pending</Button>
        <Button variant="link" href="/docs">
          Docs
        </Button>
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
