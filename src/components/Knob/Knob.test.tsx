import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { Knob } from './Knob';
import type { KnobMessages } from './messages';

const hasTouch = navigator.maxTouchPoints > 0;

function knob(name: string) {
  return screen.getByRole<HTMLInputElement>('slider', { name });
}

/** The dial around a knob's input, which takes drags, double-clicks and the wheel. */
function dial(input: HTMLElement) {
  const element = input.parentElement;
  if (!element) {
    throw new Error('dial not found');
  }
  return element;
}

/** Drags vertically on the dial by `dy` pixels (negative is up) with synthetic pointer events. */
function drag(element: HTMLElement, dy: number, { shiftKey = false, steps = 4 } = {}) {
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const init = { pointerId: 7, pointerType: 'mouse', bubbles: true, button: 0, clientX: x };
  element.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientY: y }));
  for (let step = 1; step <= steps; step += 1) {
    element.dispatchEvent(
      new PointerEvent('pointermove', { ...init, clientY: y + (dy * step) / steps, shiftKey }),
    );
  }
  element.dispatchEvent(new PointerEvent('pointerup', { ...init, clientY: y + dy }));
}

describe('Knob', () => {
  it('is a labelled slider whose value text includes the unit', () => {
    render(
      <Knob
        label="Gain"
        unit="dB"
        minValue={-24}
        maxValue={24}
        defaultValue={-6}
        description="Input gain"
      />,
    );
    const input = knob('Gain');
    expect(input).toHaveAttribute('aria-valuetext', '-6 dB');
    expect(input).toHaveValue('-6');
    expect(input).toHaveAccessibleDescription('Input gain');
    expect(screen.getByRole('textbox', { name: 'Gain value' })).toHaveValue('-6');
  });

  it('steps with arrows, takes 10 steps with PageUp/PageDown, jumps with Home/End and resets with Enter', async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    render(
      <Knob
        label="Level"
        defaultValue={50}
        resetValue={40}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />,
    );
    await userEvent.keyboard('{Tab}');
    const input = knob('Level');
    expect(input).toHaveFocus();
    expect(getComputedStyle(dial(input)).outlineStyle).toBe('solid');

    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(51);
    expect(onChangeEnd).toHaveBeenLastCalledWith(51);
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(49);
    await userEvent.keyboard('{PageUp}');
    expect(onChange).toHaveBeenLastCalledWith(59);
    await userEvent.keyboard('{PageDown}{PageDown}');
    expect(onChange).toHaveBeenLastCalledWith(39);
    await userEvent.keyboard('{End}');
    expect(input).toHaveValue('100');
    await userEvent.keyboard('{Home}');
    expect(input).toHaveValue('0');
    await userEvent.keyboard('{Enter}');
    expect(input).toHaveValue('40');
    expect(onChangeEnd).toHaveBeenLastCalledWith(40);
  });

  it('turns when dragged up or down, finer with Shift', async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    render(<Knob label="Drive" defaultValue={20} onChange={onChange} onChangeEnd={onChangeEnd} />);
    const input = knob('Drive');
    drag(dial(input), -100);
    // 100 px up is half the range.
    await expect.poll(() => input.value).toBe('70');
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenLastCalledWith(70);
    expect(input).toHaveFocus();
    drag(dial(input), 100, { shiftKey: true });
    await expect.poll(() => input.value).toBe('60');
    drag(dial(input), 1000);
    await expect.poll(() => input.value).toBe('0');
  });

  it('resets on double-click', async () => {
    render(<Knob label="Pan" minValue={-100} maxValue={100} isBipolar defaultValue={-40} />);
    const input = knob('Pan');
    await userEvent.dblClick(dial(input));
    // A bipolar knob resets to its default value.
    expect(input).toHaveValue('-40');
    render(<Knob label="Width" defaultValue={10} resetValue={50} />);
    const width = knob('Width');
    await userEvent.dblClick(dial(width));
    expect(width).toHaveValue('50');
  });

  it('has a centre detent when bipolar', async () => {
    render(<Knob label="Pan" minValue={-100} maxValue={100} isBipolar defaultValue={-10} />);
    const input = knob('Pan');
    // 10 px up is +10, which lands within the detent and sticks at the centre.
    drag(dial(input), -12);
    await expect.poll(() => input.value).toBe('0');
    drag(dial(input), -40);
    await expect.poll(() => Number(input.value)).toBeGreaterThan(20);
  });

  it('steps with the wheel only while focused', async () => {
    render(<Knob label="Gain" defaultValue={10} />);
    const input = knob('Gain');
    const wheel = (deltaY: number) =>
      dial(input).dispatchEvent(
        new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }),
      );
    wheel(-100);
    await expect.poll(() => input.value).toBe('10');
    await userEvent.keyboard('{Tab}');
    expect(wheel(-100)).toBe(false);
    await expect.poll(() => input.value).toBe('11');
    wheel(100);
    await expect.poll(() => input.value).toBe('10');
    wheel(100);
    await expect.poll(() => input.value).toBe('9');
  });

  it('takes a typed value in the inline field', async () => {
    const onChangeEnd = vi.fn();
    render(<Knob label="Cutoff" unit="Hz" maxValue={20000} onChangeEnd={onChangeEnd} />);
    const field = screen.getByRole('textbox', { name: 'Cutoff value' });
    await userEvent.clear(field);
    await userEvent.type(field, '440');
    await userEvent.keyboard('{Enter}');
    expect(onChangeEnd).toHaveBeenLastCalledWith(440);
    expect(knob('Cutoff')).toHaveAttribute('aria-valuetext', '440 Hz');
  });

  it('maps a log scale and moves 1% of the arc per arrow', async () => {
    const onChange = vi.fn();
    render(
      <Knob
        label="Frequency"
        unit="Hz"
        scale="log"
        minValue={20}
        maxValue={20000}
        defaultValue={1000}
        onChange={onChange}
      />,
    );
    const input = knob('Frequency');
    expect(input).toHaveAttribute('aria-valuetext', '1,000 Hz');
    // The input runs through positions 0–100 along the arc.
    expect(Number(input.value)).toBe(57);
    await userEvent.keyboard('{Tab}{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(1072);
  });

  it('ignores input while disabled or read-only', async () => {
    const onChange = vi.fn();
    render(
      <>
        <Knob label="Read-only" defaultValue={30} isReadOnly onChange={onChange} />
        <Knob label="Disabled" defaultValue={30} isDisabled onChange={onChange} />
      </>,
    );
    expect(knob('Disabled')).toBeDisabled();
    await userEvent.keyboard('{Tab}{ArrowUp}');
    drag(dial(knob('Read-only')), -100);
    drag(dial(knob('Disabled')), -100);
    expect(onChange).not.toHaveBeenCalled();
    expect(knob('Read-only')).toHaveAttribute('aria-readonly', 'true');
  });

  it.runIf(hasTouch)('has a touch target of at least 44 px, even when small', () => {
    render(<Knob label="Small" size="sm" />);
    const element = dial(knob('Small'));
    const rect = element.getBoundingClientRect();
    const before = getComputedStyle(element, '::before');
    expect(rect.width - parseFloat(before.left) - parseFloat(before.right)).toBeGreaterThanOrEqual(
      44,
    );
    expect(rect.height - parseFloat(before.top) - parseFloat(before.bottom)).toBeGreaterThanOrEqual(
      44,
    );
    // A vertical drag turns the knob; horizontal pans are left to the page.
    expect(getComputedStyle(element).touchAction).toBe('pan-x');
  });

  it.runIf(hasTouch)('turns with a touch drag', async () => {
    render(<Knob label="Touch" defaultValue={0} />);
    const element = dial(knob('Touch'));
    const rect = element.getBoundingClientRect();
    const init = {
      pointerId: 3,
      pointerType: 'touch',
      bubbles: true,
      clientX: rect.left + rect.width / 2,
    };
    element.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientY: 300 }));
    element.dispatchEvent(new PointerEvent('pointermove', { ...init, clientY: 260 }));
    element.dispatchEvent(new PointerEvent('pointerup', { ...init, clientY: 260 }));
    await expect.poll(() => knob('Touch').value).toBe('20');
  });

  it('takes the app’s strings from UIProvider', () => {
    const messages: Partial<Messages & KnobMessages> = {
      knobValueInput: ({ label }) => `Wert von ${label}`,
      knobValueWithUnit: ({ value, unit }) => `${unit} ${value}`,
    };
    render(
      <UIProvider messages={messages}>
        <Knob label="Pegel" unit="dB" defaultValue={3} />
      </UIProvider>,
    );
    expect(screen.getByRole('textbox', { name: 'Wert von Pegel' })).toBeInTheDocument();
    expect(knob('Pegel')).toHaveAttribute('aria-valuetext', 'dB 3');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="flex flex-wrap gap-4 p-4">
        <Knob label="Gain" unit="dB" defaultValue={10} description="Input gain" />
        <Knob label="Pan" minValue={-1} maxValue={1} step={0.1} isBipolar />
        <Knob label="Invalid" defaultValue={95} isInvalid errorMessage="Clipping" />
        <Knob label="Disabled" defaultValue={50} isDisabled />
        <Knob aria-label="Unlabelled" size="sm" isValueEditable={false} ticks={[0, 50, 100]} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
