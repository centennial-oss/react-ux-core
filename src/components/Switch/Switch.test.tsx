import { render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Switch } from './Switch';

const hasTouch = navigator.maxTouchPoints > 0;

describe('Switch', () => {
  it('is a labelled, described switch that toggles with the pointer', async () => {
    const onChange = vi.fn();
    render(
      <Switch description="Sent once a day" onChange={onChange}>
        Email digest
      </Switch>,
    );
    const control = screen.getByRole('switch', { name: 'Email digest' });
    expect(control).toHaveAccessibleDescription('Sent once a day');
    expect(control).not.toBeChecked();
    await userEvent.click(screen.getByText('Email digest'));
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(control).toBeChecked();
    await userEvent.click(screen.getByText('Email digest'));
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(control).not.toBeChecked();
  });

  it('toggles with Space and shows a focus ring for keyboard focus', async () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>Dark mode</Switch>);
    await userEvent.keyboard('{Tab}');
    const control = screen.getByRole('switch', { name: 'Dark mode' });
    expect(control).toHaveFocus();
    const button = control.closest('label');
    expect(button).toHaveAttribute('data-focus-visible', 'true');
    const track = button?.querySelector('[aria-hidden="true"]');
    expect(track && getComputedStyle(track).outlineStyle).toBe('solid');
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(control).toBeChecked();
  });

  it('starts from defaultSelected when uncontrolled', () => {
    render(<Switch defaultSelected>Autosave</Switch>);
    expect(screen.getByRole('switch', { name: 'Autosave' })).toBeChecked();
  });

  it('follows a controlled value and stays put when the parent does not update it', async () => {
    function Controlled() {
      const [isOn, setOn] = useState(true);
      return (
        <>
          <Switch isSelected={isOn} onChange={setOn}>
            Alerts
          </Switch>
          <output>{isOn ? 'on' : 'off'}</output>
        </>
      );
    }
    const { unmount } = render(<Controlled />);
    const control = screen.getByRole('switch', { name: 'Alerts' });
    expect(control).toBeChecked();
    await userEvent.click(screen.getByText('Alerts'));
    expect(control).not.toBeChecked();
    expect(screen.getByRole('status').textContent).toBe('off');
    unmount();

    const onChange = vi.fn();
    render(
      <Switch isSelected={false} onChange={onChange}>
        Locked
      </Switch>,
    );
    await userEvent.click(screen.getByText('Locked'));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Locked' })).not.toBeChecked();
  });

  it('moves the thumb to the end when on', async () => {
    render(<Switch>Wi-Fi</Switch>);
    const track = screen.getByText('Wi-Fi').previousElementSibling;
    const thumb = track?.firstElementChild;
    if (!track || !thumb) {
      throw new Error('missing track');
    }
    const offset = () => thumb.getBoundingClientRect().left - track.getBoundingClientRect().left;
    const offPosition = offset();
    await userEvent.click(screen.getByText('Wi-Fi'));
    // The transition may still be running; wait for the thumb to settle at the far end.
    await expect.poll(offset).toBeGreaterThan(offPosition + 15);
  });

  it('animates the thumb with the fast motion token, which reduced motion sets to zero', () => {
    render(<Switch>Sync</Switch>);
    const thumb = screen.getByText('Sync').previousElementSibling?.firstElementChild;
    if (!thumb) {
      throw new Error('missing thumb');
    }
    const token = getComputedStyle(document.documentElement).getPropertyValue('--duration-fast');
    const expected = parseFloat(token) / 1000;
    const durations = getComputedStyle(thumb).transitionDuration.split(',').map(parseFloat);
    expect(durations.length).toBeGreaterThan(0);
    for (const duration of durations) {
      expect(duration).toBeCloseTo(expected, 5);
    }
  });

  it('shows an error message and marks the switch invalid', () => {
    render(
      <Switch isInvalid errorMessage="Turn this on to continue">
        Accept policy
      </Switch>,
    );
    const control = screen.getByRole('switch', { name: 'Accept policy' });
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Turn this on to continue')).toBeInTheDocument();
    expect(control).toHaveAccessibleDescription(/Turn this on to continue/);
  });

  it('does not toggle when disabled or read-only', async () => {
    const onChange = vi.fn();
    render(
      <>
        <Switch isDisabled onChange={onChange}>
          Disabled
        </Switch>
        <Switch isReadOnly defaultSelected onChange={onChange}>
          Read only
        </Switch>
      </>,
    );
    expect(screen.getByRole('switch', { name: 'Disabled' })).toBeDisabled();
    await userEvent.click(screen.getByText('Disabled'), { force: true });
    await userEvent.click(screen.getByText('Read only'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Read only' })).toBeChecked();
  });

  it('takes a ref, className, aria-label and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Switch ref={ref} aria-label="Bluetooth" className="mt-4" data-testid="switch" />);
    expect(screen.getByRole('switch', { name: 'Bluetooth' })).toBeInTheDocument();
    expect(ref.current).toBe(screen.getByTestId('switch'));
    expect(ref.current?.className).toContain('mt-4');
  });

  it.runIf(hasTouch)('toggles when tapped, with a touch-sized target', async () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>Location</Switch>);
    await commands.tap('label');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    const label = screen.getByText('Location').closest('label');
    expect(label?.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <Switch description="Help">Labelled</Switch>
        <Switch defaultSelected>On</Switch>
        <Switch isDisabled>Disabled</Switch>
        <Switch isInvalid errorMessage="Required">
          Invalid
        </Switch>
        <Switch aria-label="Icon only" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
